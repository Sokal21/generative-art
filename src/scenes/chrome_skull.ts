import p5 from "p5";
import { Scene } from ".";
import { DEFAULT_PARAMS, EffectParams, FigureId, hexToRgb } from "../../shared/protocol";
import { drawShaded } from "../engine/runtime";
import { Microphone } from "../inputs/microphone";
import fragment from "./chrome_skull.frag?raw";
import faceFragment from "./club_face.frag?raw";

const VERTEX = `
attribute vec3 aPosition;

void main() {
  vec4 position = vec4(aPosition, 1.0);
  position.xy = position.xy * 2.0 - 1.0;
  gl_Position = position;
}
`;

// Las figuras se turnan en cada corte. El color elegido en el panel manda sobre el de cada una.
const ACCENTS: Record<Exclude<FigureId, "auto">, string> = {
  skull: "#ff5a12",
  demon: "#ff1626",
  angel: "#ffe2a8",
  android: "#27d7ff",
  creature: "#b45cff",
  face: "#ff1fa8",
};
const ROTATION = Object.keys(ACCENTS) as Exclude<FigureId, "auto">[];
// La carpeta no se sube a git: sin la foto, esa figura se saltea.
const FACE_URL = "/faces/alejo.jpg";

// A 48 kHz con la FFT de 1024, cada bin son unos 47 Hz: esto llega a ~400 Hz.
const BASS_BINS = 8;
const BEAT_RATIO = 1.3;
const BEAT_MIN_BASS = 0.12;
const BEAT_COOLDOWN_S = 0.16;
const SILENCE = 0.04;
const MIN_PEAK = 0.15;

// Los cortes de plano caen en un golpe, cada tantos. Sin música, cada tanto tiempo.
const CUT_EVERY_BEATS = 16;
const CUT_EVERY_S = 18;
const GLITCH_EVERY_BEATS = 4;

// Planos de una toma de recital: de abajo y monumental, de frente, de cerca a los ojos.
const SHOTS = [
  { yaw: 0, height: -1.1, distance: 4.4, aim: 0.25, focal: 1.5 },
  { yaw: 0.55, height: -0.25, distance: 4.2, aim: 0.1, focal: 1.45 },
  { yaw: 0, height: 0.1, distance: 2.1, aim: 0.03, focal: 1.5 },
  { yaw: -0.8, height: -0.5, distance: 4, aim: 0.1, focal: 1.3 },
  { yaw: 0.18, height: -0.75, distance: 3, aim: -0.3, focal: 1.3 },
];

/**
 * Figuras de cromo gigantes flotando en lo negro: calavera, demonio, ángel y
 * androide. Visuales de techno melódico en clave de Halloween: casi sin color
 * salvo uno, con cortes sobre los golpes. Sin música queda respirando despacio.
 */
export class ChromeSkull implements Scene {
  private shader: p5.Shader;
  private drift = Math.random() * 100;
  private level = 0;
  private flash = 0;
  private kick = 0;
  private glitch = 0;
  private seed = 0;
  private peak = 0.2;
  private bassAverage = 0;
  private sinceBeat = 0;
  private beats = 0;
  private shot = 0;
  private turn = 0;
  private faceShader: p5.Shader;
  private photo: p5.Image | null = null;
  private sinceCut = 0;
  private params = DEFAULT_PARAMS;

  // `only` deja la escena fija en una figura, sin importar lo elegido en el panel.
  constructor(private readonly p: p5, private readonly mic: Microphone, private readonly only?: FigureId) {
    this.shader = p.createShader(VERTEX, fragment);
    this.faceShader = p.createShader(VERTEX, faceFragment);
    p.loadImage(FACE_URL, (image) => (this.photo = image), () => console.warn("[skull] no está la foto"));
  }

  resize() {
    // Nada que recalcular: draw() lee el tamaño del canvas en cada frame.
  }

  dispose() {}

  setParams(params: EffectParams) {
    this.params = params;
  }

  draw() {
    // Tope para que volver de una pestaña oculta no pegue un salto.
    const dt = Math.min(this.p.deltaTime / 1000, 0.1);
    const { volume, bass } = this.listen();
    const energy = Math.max(volume, bass * 0.6);

    this.peak = Math.max(energy, this.peak * Math.pow(0.97, dt), MIN_PEAK);
    const target = energy < SILENCE ? 0 : Math.min(1, energy / this.peak);
    const rate = target > this.level ? 12 : 1.8;
    this.level += (target - this.level) * Math.min(1, rate * dt);

    this.sinceBeat += dt;
    if (bass > BEAT_MIN_BASS && bass > this.bassAverage * BEAT_RATIO && this.sinceBeat > BEAT_COOLDOWN_S) {
      this.sinceBeat = 0;
      this.onBeat();
    }
    this.bassAverage += (bass - this.bassAverage) * Math.min(1, 2.5 * dt);
    this.flash *= Math.exp(-6 * dt);
    this.kick *= Math.exp(-8 * dt);
    this.glitch *= Math.exp(-14 * dt);

    this.sinceCut += dt;
    if (this.sinceCut > CUT_EVERY_S) this.cut();

    this.drift += (0.25 + 1.1 * this.level) * dt;
    this.paint();
  }

  private onBeat() {
    this.beats += 1;
    this.flash = 1;
    this.kick = 1;
    this.seed = Math.random() * 100;
    if (this.beats % GLITCH_EVERY_BEATS === 0) this.glitch = 1;
    if (this.beats % CUT_EVERY_BEATS === 0) this.cut();
  }

  private cut() {
    this.shot = (this.shot + 1) % SHOTS.length;
    this.turn = (this.turn + 1) % ROTATION.length;
    this.sinceCut = 0;
  }

  // La elegida en el panel, o la que le toca en la rotación.
  private figure() {
    const wanted = this.only ?? this.params.figure;
    const chosen = wanted === "auto" ? ROTATION[this.turn] : wanted;
    return chosen === "face" && !this.photo ? "skull" : chosen;
  }

  private paint() {
    const figure = this.figure();
    const accent = hexToRgb(this.params.color ?? ACCENTS[figure]).map((channel) => channel / 255);
    const shared = {
      drift: this.drift,
      level: this.level,
      flash: this.flash,
      kick: this.kick,
      glitch: this.glitch,
      seed: this.seed,
      accent,
      brightness: this.params.brightness,
      contrast: this.params.contrast,
      saturation: this.params.saturation,
    };
    if (figure === "face") {
      drawShaded(this.p, this.faceShader, this.photo as unknown as p5.Element, shared);
      return;
    }
    const shot = SHOTS[this.shot];
    const yaw = shot.yaw + Math.sin(this.drift * 0.17) * 0.16;
    drawShaded(this.p, this.shader, null, {
      eye: [
        Math.sin(yaw) * shot.distance,
        shot.height + Math.sin(this.drift * 0.23) * 0.06,
        Math.cos(yaw) * shot.distance,
      ],
      aim: shot.aim,
      focal: shot.focal,
      ...shared,
      jaw: 0.015 + 0.17 * this.level * this.level + 0.05 * this.kick,
      figure: ROTATION.indexOf(figure),
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
