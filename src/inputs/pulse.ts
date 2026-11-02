import { Microphone } from "./microphone";

// A 48 kHz con la FFT de 1024, cada bin son unos 47 Hz: esto llega a ~400 Hz.
const BASS_BINS = 8;
const BEAT_RATIO = 1.3;
const BEAT_MIN_BASS = 0.12;
const BEAT_COOLDOWN_S = 0.16;
// Por debajo de esto se considera silencio, aunque el micrófono tenga ruido de fondo.
const SILENCE = 0.04;
const MIN_PEAK = 0.15;

/**
 * Lo que una escena necesita saber de la música: cuán fuerte viene, relativo a
 * lo más fuerte que sonó, y cuándo pega un golpe de bajo.
 */
export class Pulse {
  // 0 en silencio, 1 a todo lo que venía sonando.
  level = 0;
  private peak = 0.2;
  private bassAverage = 0;
  private sinceBeat = 0;

  constructor(private readonly mic: Microphone) {}

  /** Avanza `dt` segundos; true si en este cuadro pegó un golpe. */
  update(dt: number): boolean {
    const { volume, bass } = this.listen();
    // El promedio solo casi no registra un tema de puros graves.
    const energy = Math.max(volume, bass * 0.6);

    // Se ajusta a lo más fuerte que viene sonando: sirve en un living y al lado de un parlante.
    this.peak = Math.max(energy, this.peak * Math.pow(0.97, dt), MIN_PEAK);
    const target = energy < SILENCE ? 0 : Math.min(1, energy / this.peak);
    const rate = target > this.level ? 12 : 1.8;
    this.level += (target - this.level) * Math.min(1, rate * dt);

    this.sinceBeat += dt;
    const beat =
      bass > BEAT_MIN_BASS && bass > this.bassAverage * BEAT_RATIO && this.sinceBeat > BEAT_COOLDOWN_S;
    if (beat) this.sinceBeat = 0;
    this.bassAverage += (bass - this.bassAverage) * Math.min(1, 2.5 * dt);
    return beat;
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
