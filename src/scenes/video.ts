import p5 from "p5";
import { Scene, SceneContext } from ".";
import { EffectParams, ShaderId } from "../../shared/protocol";
import { drawShaded } from "../engine/runtime";

export class VideoScene implements Scene {
  private video: p5.MediaElement;

  constructor(
    private readonly ctx: SceneContext,
    readonly url: string,
    private shaderId: ShaderId,
    private params: EffectParams,
    onError: (message: string | null) => void
  ) {
    this.video = ctx.p.createVideo(url);
    this.video.hide();

    const element: HTMLVideoElement = this.video.elt;
    // Sin sonido el navegador deja reproducir sin que nadie toque la pantalla.
    element.muted = true;
    element.playsInline = true;
    element.onerror = () => onError(`No se pudo cargar ${url}`);
    element.onplaying = () => onError(null);

    this.video.loop();
    this.setParams(params);
  }

  setShader(shaderId: ShaderId) {
    this.shaderId = shaderId;
  }

  setParams(params: EffectParams) {
    this.params = params;
    this.video.speed(params.speed);
  }

  resize() {
    // Nada que recalcular: draw() lee el tamaño del canvas en cada frame.
  }

  dispose() {
    this.video.elt.onerror = this.video.elt.onplaying = null;
    this.video.pause();
    this.video.remove();
  }

  draw() {
    if (this.video.elt.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const { brightness, contrast, saturation, distortion, speed } = this.params;
    drawShaded(this.ctx.p, this.ctx.shader(this.shaderId), this.video, {
      brightness,
      contrast,
      saturation,
      distortion,
      speed,
      offset: [distortion * 0.05, distortion * 0.05],
    });
  }
}
