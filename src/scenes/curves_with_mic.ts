import p5 from "p5";
import { Scene } from ".";
import { Curve } from "../utils/curve";

export class CurvesWithMic implements Scene {
  curves: Curve[];

  constructor(
    public p5: p5,
    private readonly canvasWidth: number,
    private readonly canvasHeight: number // private readonly minYchange: number,
  ) {
    this.curves = [
      new Curve(
        p5,
        51,
        245,
        0,
        canvasHeight / 2 - 100,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 123),
        p5.color(245, 51, 135)
      ),
      new Curve(
        p5,
        60,
        450,
        0,
        canvasHeight / 2 + 50,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 4),
        p5.color(190, 51, 245)
      ),
      new Curve(
        p5,
        100,
        600,
        0,
        canvasHeight / 2,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI),
        p5.color(51, 245, 206)
      ),
    ];
  }

  delete() {}

  draw(): void {
    this.curves.forEach((curve) => {
      curve.draw(this.canvasWidth, this.canvasHeight);
      this.p5.blendMode(this.p5.MULTIPLY);
      curve.phase += 0.005;
    });
  }
}
