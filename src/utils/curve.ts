import p5 from "p5";
import { Stroke } from "./stroke";

export class Curve {
  constructor(
    private readonly p5: p5,
    public amplitude: number,
    public period: number,
    public phase: number,
    public yOffset: number,
    private readonly modificator?: (x: number) => number,
    public color?: p5.Color,
    public stroke?: Stroke,
  ) { }

  apply(x: number): number {
    const y =
      this.p5.sin(
        this.phase +
        ((this.p5.TWO_PI * x) / this.period) * (this.modificator?.(x) || 1)
      ) * this.amplitude;

    return y;
  }

  draw(canvasWidth: number, canvasHeight: number) {
    this.p5.beginShape();

    if (this.color) {
      this.p5.fill(this.color);
    }

    if (this.stroke) {
      this.stroke.draw();
    } else {
      this.p5.noStroke();
    }

    for (let x = 0; x < canvasWidth; x++) {
      this.p5.vertex(x, this.apply(x) + this.yOffset);
    }

    this.p5.vertex(canvasWidth + 100, canvasHeight);
    this.p5.vertex(0, canvasWidth);

    this.p5.endShape();
  }
}
