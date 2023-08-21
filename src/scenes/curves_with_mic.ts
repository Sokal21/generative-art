import p5 from "p5";
import { Scene } from ".";
import { Curve } from "../utils/curve";
import { Microphone } from "../inputs/microphone";
import { Stroke } from "../utils/stroke";
import { Clock } from "../utils/clock";
import { Sun } from "../utils/sun";


export class CurvesWithMic implements Scene {
  landScape: Curve[];
  mountain: [Curve, Curve];
  sun: Sun;
  clock = new Clock(0.08);
  fasterClock = new Clock(0.3);

  constructor(
    public p5: p5,
    canvasWidth: number,
    canvasHeight: number, // private readonly minYchange: number,
    private readonly microphone: Microphone,
  ) {
    const stroke = new Stroke(p5, p5.color(23, 24, 24), 1);

    this.sun = new Sun(
      p5,
      canvasWidth / 2 + 230,
      canvasHeight / 2 - 200,
      200,
      p5.color(255, 127, 81),
      250,
      p5.color(206, 66, 87),
      this.fasterClock,
      stroke,
    )

    this.mountain = [
      new Curve(
        p5,
        canvasWidth,
        canvasHeight,
        240,
        1800,
        90,
        canvasHeight / 2 - 100,
        // undefined,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 35) + 1.009,
        p5.color(255),
        stroke
      ),
      new Curve(
        p5,
        canvasWidth,
        canvasHeight,
        240,
        1880,
        90,
        canvasHeight / 2 - 100,
        // undefined,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 98) + 1.007,
        p5.color(255),
        stroke
      )
    ]

    this.landScape = [
      new Curve(
        p5,
        canvasWidth,
        canvasHeight,
        80,
        1200,
        0,
        canvasHeight / 2 + 100,
        // undefined,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 123) * 1.5,
        p5.color(99, 88, 94),
        stroke
      ),
      new Curve(
        p5,
        canvasWidth,
        canvasHeight,
        60,
        450,
        0,
        canvasHeight / 2 + 130,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 4) * 0.4,
        p5.color(229, 212, 192),
        stroke
      ),
      new Curve(
        p5,
        canvasWidth,
        canvasHeight,
        76,
        516,
        0,
        canvasHeight / 2 + 160,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 189) * 0.4,
        p5.color(153, 141, 160),
        stroke
      ),
      new Curve(
        p5,
        canvasWidth,
        canvasHeight,
        100,
        600,
        0,
        canvasHeight / 2 + 200,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI) * 0.1,
        p5.color(185, 192, 218),
        stroke
      ),
      new Curve(
        p5,
        canvasWidth,
        canvasHeight,
        100,
        543,
        0,
        canvasHeight / 2 + 220,
        (x: number) => p5.noise((x / canvasHeight) * p5.PI, 360) * 0.1,
        p5.color(196, 218, 207),
        stroke
      ),
    ];
  }

  delete() { }

  draw(): void {
    const speed = this.microphone.getAverageVolume();

    this.sun.draw();

    const mountain1 = this.mountain[0];
    const mountain2 = this.mountain[1];

    mountain1.draw((x) => this.p5.lerp(mountain1.apply(x), mountain2.apply(x), this.clock.percentage()));

    this.clock.tick(() => {
      this.mountain = [mountain2, mountain1];
    })
    this.fasterClock.tick(() => {
      this.sun.invert();
    })

    this.landScape.forEach((curve) => {
      curve.draw();
      // this.p5.blendMode(this.p5.MULTIPLY);
      curve.phase += Math.max(speed / 50 * 0.01, 0.002);
    });

    this.p5.blendMode(this.p5.BLEND);
  }
}
