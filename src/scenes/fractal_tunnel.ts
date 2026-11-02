import p5 from "p5";
import { Scene } from ".";
import { complementary, DEFAULT_PARAMS, EffectParams, hexToRgb, TUNNEL_IDS, TunnelId } from "../../shared/protocol";
import { drawShaded } from "../engine/runtime";
import { Microphone } from "../inputs/microphone";
import apollonian from "./tunnels/apollonian.frag?raw";
import cave from "./tunnels/cave.frag?raw";
import head from "./tunnels/head.frag?raw";
import julia from "./tunnels/julia.frag?raw";
import kaliset from "./tunnels/kaliset.frag?raw";
import kalisetCore from "./tunnels/kaliset_core.frag?raw";
import mandelbox from "./tunnels/mandelbox.frag?raw";
import march from "./tunnels/march.frag?raw";
import menger from "./tunnels/menger.frag?raw";
import neon from "./tunnels/neon.frag?raw";
import tail from "./tunnels/tail.frag?raw";

const FRAGMENTS: Record<TunnelId, string[]> = {
  kaliset: [kalisetCore, kaliset],
  cave: [kalisetCore, cave],
  menger: [march, menger],
  mandelbox: [march, mandelbox],
  apollonian: [march, apollonian],
  julia: [julia],
  neon: [neon],
};

const VERTEX = `
attribute vec3 aPosition;

void main() {
  vec4 position = vec4(aPosition, 1.0);
  position.xy = position.xy * 2.0 - 1.0;
  gl_Position = position;
}
`;

// A 48 kHz con la FFT de 1024, cada bin son unos 47 Hz: esto llega a ~400 Hz.
const BASS_BINS = 8;
const BEAT_RATIO = 1.3;
const BEAT_MIN_BASS = 0.12;
const BEAT_COOLDOWN_S = 0.16;
// Por debajo de esto se considera silencio, aunque el micrófono tenga ruido de fondo.
const SILENCE = 0.04;
const MIN_PEAK = 0.15;

// Si no llega ningún golpe, un cambio armado entra igual pasado este tiempo.
const ARMED_TIMEOUT_S = 4;

const toUniform = (hex: string) => hexToRgb(hex).map((channel) => channel / 255);

/**
 * Viaje por un fractal. El shader solo dibuja: el sonido se convierte acá en
 * valores acumulados, para que un cambio de volumen acelere sin dar saltos.
 * Sin micrófono o en silencio queda flotando despacio.
 */
export class FractalTunnel implements Scene {
  private shaders: Record<TunnelId, p5.Shader>;
  // Los que todavía no se dibujaron: compilar el shader recién al usarlo trabaría la imagen.
  private cold: TunnelId[] = [...TUNNEL_IDS];
  private shown: TunnelId | null = null;
  private incoming: TunnelId | null = null;
  private blend = 0;
  private armed: TunnelId | null = null;
  private armedFor = 0;
  private sinceAuto = 0;
  private beatsSinceAuto = 0;
  private travel = 0;
  private twist = 0;
  private hue = Math.random();
  private level = 0;
  private opening = 0;
  private flash = 0;
  private kick = 0;
  private peak = 0.2;
  private bassAverage = 0;
  private sinceBeat = 0;
  private params = DEFAULT_PARAMS;

  constructor(private readonly p: p5, private readonly mic: Microphone) {
    this.shaders = Object.fromEntries(
      TUNNEL_IDS.map((id) => [id, p.createShader(VERTEX, [head, ...FRAGMENTS[id], tail].join("\n"))])
    ) as Record<TunnelId, p5.Shader>;
  }

  resize() {
    // Nada que recalcular: draw() lee el tamaño del canvas en cada frame.
  }

  dispose() {}

  setParams(params: EffectParams) {
    const changed = params.tunnel !== this.params.tunnel;
    if (params.autoMode !== this.params.autoMode) {
      this.sinceAuto = 0;
      this.beatsSinceAuto = 0;
    }
    this.params = params;
    if (this.shown === null) this.shown = params.tunnel;
    else if (changed) this.request(params.tunnel);
  }

  draw() {
    // Tope para que volver de una pestaña oculta no pegue un salto.
    const dt = Math.min(this.p.deltaTime / 1000, 0.1);
    const { volume, bass } = this.listen();
    // El promedio solo casi no registra un tema de puros graves.
    const energy = Math.max(volume, bass * 0.6);

    // Se ajusta a lo más fuerte que viene sonando: la misma escena sirve en un
    // living y al lado de un parlante.
    this.peak = Math.max(energy, this.peak * Math.pow(0.97, dt), MIN_PEAK);
    const target = energy < SILENCE ? 0 : Math.min(1, energy / this.peak);
    const rate = target > this.level ? 12 : 1.8;
    this.level += (target - this.level) * Math.min(1, rate * dt);

    this.sinceBeat += dt;
    if (
      bass > BEAT_MIN_BASS &&
      bass > this.bassAverage * BEAT_RATIO &&
      this.sinceBeat > BEAT_COOLDOWN_S
    ) {
      this.sinceBeat = 0;
      this.onBeat();
      this.flash = 1;
      this.kick = 1;
      this.hue += 0.07;
    }
    this.bassAverage += (bass - this.bassAverage) * Math.min(1, 2.5 * dt);
    this.flash *= Math.exp(-5 * dt);
    this.kick *= Math.exp(-8 * dt);

    this.travel += (0.07 + 1.1 * this.level * this.level) * dt;
    this.twist += (0.03 + 0.25 * this.level) * dt;
    this.hue += (0.012 + 0.03 * this.level) * dt;
    this.opening += (this.level - this.opening) * Math.min(1, 3 * dt);

    this.advanceSwitching(dt);

    const warming = this.cold.pop();
    if (warming) this.paint(warming, 1);
    const shown = (this.shown ??= this.params.tunnel);
    this.paint(shown, 1);
    if (this.incoming) this.paint(this.incoming, this.blend);
  }

  // Un cambio pedido: entra ya, o en el próximo golpe si está armado para eso.
  private request(tunnel: TunnelId) {
    if (this.params.onBeat) {
      this.armed = tunnel;
      this.armedFor = 0;
    } else {
      this.start(tunnel);
    }
  }

  private start(tunnel: TunnelId) {
    this.armed = null;
    this.sinceAuto = 0;
    this.beatsSinceAuto = 0;
    // Si venía otro fundido, ese túnel queda firme y arranca el nuevo.
    if (this.incoming) this.shown = this.incoming;
    if (this.params.fade > 0 && tunnel !== this.shown) {
      this.incoming = tunnel;
      this.blend = 0;
    } else {
      this.incoming = null;
      this.shown = tunnel;
    }
  }

  private nextInRotation(): TunnelId {
    const from = this.incoming ?? this.shown ?? this.params.tunnel;
    return TUNNEL_IDS[(TUNNEL_IDS.indexOf(from) + 1) % TUNNEL_IDS.length];
  }

  private onBeat() {
    this.beatsSinceAuto += 1;
    if (this.armed) this.start(this.armed);
    else if (this.params.autoMode === "beats" && this.beatsSinceAuto >= this.params.autoEvery) {
      this.start(this.nextInRotation());
    }
  }

  private advanceSwitching(dt: number) {
    if (this.incoming) {
      this.blend += dt / this.params.fade;
      if (this.blend >= 1) {
        this.shown = this.incoming;
        this.incoming = null;
      }
    }
    if (this.armed) {
      this.armedFor += dt;
      if (this.armedFor > ARMED_TIMEOUT_S) this.start(this.armed);
    }
    this.sinceAuto += dt;
    if (this.params.autoMode === "seconds" && this.sinceAuto >= this.params.autoEvery) {
      this.request(this.nextInRotation());
      this.sinceAuto = 0;
    }
  }

  private paint(tunnel: TunnelId, fade: number) {
    const { color, morph } = this.params;
    drawShaded(this.p, this.shaders[tunnel], null, {
      fade,
      morph,
      travel: this.travel,
      twist: this.twist,
      hue: this.hue,
      opening: this.opening,
      flash: this.flash,
      kick: this.kick,
      brightness: this.params.brightness,
      contrast: this.params.contrast,
      saturation: this.params.saturation,
      tinted: color ? 1 : 0,
      colorA: toUniform(color ?? "#000000"),
      colorB: toUniform(complementary(color ?? "#000000")),
    });
  }

  private listen() {
    const data = this.mic.getByteFrequencyData();
    // La mitad de arriba del arreglo no la llena el analizador.
    const bins = data.length / 2;
    let volume = 0;
    let bass = 0;
    for (let i = 0; i < bins; i++) {
      volume += data[i];
      if (i >= 1 && i <= BASS_BINS) bass += data[i];
    }
    return { volume: volume / bins / 255, bass: bass / BASS_BINS / 255 };
  }
}
