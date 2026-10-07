import p5 from "p5";
import { Scene, SceneContext } from ".";
import { DEFAULT_PARAMS, ShaderId } from "../../shared/protocol";
import { drawShaded } from "../engine/runtime";

export class CameraScene implements Scene {
  private capture: p5.Element;

  constructor(private readonly ctx: SceneContext, private shaderId: ShaderId) {
    this.capture = ctx.p.createCapture("video");
    this.capture.hide();
  }

  setShader(shaderId: ShaderId) {
    this.shaderId = shaderId;
  }

  resize() {
    // Nada que recalcular: draw() lee el tamaño del canvas en cada frame.
  }

  dispose() {
    const stream = this.capture.elt.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    this.capture.remove();
  }

  draw() {
    const { p } = this.ctx;
    const micLevel = this.ctx.mic().getAverageVolume() / 255;
    const speed = p.map(micLevel, 0, 1, 0.5, 10.0, true);
    const offset = p.map(micLevel, 0, 1, 0, 0.2, true);

    drawShaded(p, this.ctx.shader(this.shaderId), this.capture, {
      ...DEFAULT_PARAMS,
      speed,
      offset: [offset, offset],
    });
  }
}
