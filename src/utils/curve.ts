import p5 from "p5";
import { Stroke } from "./stroke";


// Gran video para mejorar este código
// https://www.youtube.com/watch?v=y7sgcFhk6ZM&ab_channel=TheCodingTrain
export class Curve {
  constructor(
    private readonly p5: p5,
    public canvasWidth: number,
    public canvasHeight: number,
    public amplitude: number,
    public period: number,
    public phase: number,
    public yOffset: number,
    private readonly modificator?: (x: number) => number,
    public color?: p5.Color,
    public stroke?: Stroke,
  ) {
    this.apply = this.apply.bind(this);
  }

  apply(x: number): number {
    const y =
      this.p5.sin(
        this.phase +
        ((this.p5.TWO_PI * x) / this.period) * (this.modificator?.(x) || 1)
      ) * this.amplitude;

    return y;
  }

  draw(apply: (x: number) => number = this.apply) {
    this.p5.beginShape();

    if (this.color) {
      this.p5.fill(this.color);
    }

    if (this.stroke) {
      this.stroke.draw();
    } else {
      this.p5.noStroke();
    }

    for (let x = 0; x < this.canvasWidth; x++) {
      this.p5.vertex(x, apply(x) + this.yOffset);
    }

    this.p5.vertex(this.canvasWidth + 100, this.canvasHeight);
    this.p5.vertex(0, this.canvasWidth);

    this.p5.endShape();
  }
}
