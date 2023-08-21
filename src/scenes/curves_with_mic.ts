import p5 from "p5";
import { Scene } from ".";
import { Curve } from "../utils/curve";
import { Microphone } from "../inputs/microphone";
import { Stroke } from "../utils/stroke";

export class CurvesWithMic implements Scene {
  curves: Curve[];

  constructor(
    public p5: p5,
    private readonly canvasWidth: number,
    private readonly canvasHeight: number, // private readonly minYchange: number,
    private readonly microphone: Microphone,
  ) {
    const stroke = new Stroke(p5, p5.color(76, 78, 89), 1)

    this.curves = [
      new Curve(
        p5,
        80,
        1200,
        0,
        canvasHeight / 2 - 50,
        // undefined,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 123) * 1.5,
        p5.color(255, 199, 216),
        stroke
      ),
      new Curve(
        p5,
        60,
        450,
        0,
        canvasHeight / 2 + 100,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 4) * 0.4,
        p5.color(219, 81, 123),
        stroke
      ),
      new Curve(
        p5,
        76,
        516,
        0,
        canvasHeight / 2 + 135,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 189) * 0.4,
        p5.color(140, 55, 86),
        stroke
      ),
      new Curve(
        p5,
        100,
        600,
        0,
        canvasHeight / 2 + 200,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI) * 0.1,
        p5.color(106, 126, 171),
        stroke
      ),
      new Curve(
        p5,
        100,
        543,
        0,
        canvasHeight / 2 + 220,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 360) * 0.1,
        p5.color(135, 147, 214),
        stroke
      ),
    ];
  }

  delete() { }

  draw(): void {
    const speed = this.microphone.getAverageVolume();

    this.curves.forEach((curve) => {
      curve.draw(this.canvasWidth, this.canvasHeight);
      // this.p5.blendMode(this.p5.MULTIPLY);
      curve.phase += Math.max(speed / 50 * 0.01, 0.002);
    });

    this.p5.blendMode(this.p5.BLEND);
  }
}
