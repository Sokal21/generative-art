import p5 from "p5";
import { Scene } from ".";
import { Curve } from "../figures/curve";
import { Microphone } from "../inputs/microphone";
import { Stroke } from "../utils/stroke";
import { Clock } from "../utils/clock";
import { Sun } from "../figures/sun";
import { Circular } from "../traslations/circular";
import { LinearGradient } from "../utils/linear_gradient";


export class CurvesWithMic implements Scene {
  landscape: Curve[];
  mountain: [Curve, Curve];
  sun: Sun;
  moon: Sun;
  landscapeClock = new Clock(0.08);
  dayNightClock = new Clock(0.001);
  rotationCenter: p5.Vector;
  time = 0;

  constructor(
    public p5: p5,
    private readonly canvasWidth: number,
    private readonly canvasHeight: number, // private readonly minYchange: number,
    private readonly microphone: Microphone,
  ) {
    const stroke = new Stroke(p5, p5.color(23, 24, 24), 1);

    this.rotationCenter = this.p5.createVector(canvasWidth / 2 + 230, canvasHeight);

    this.moon = new Sun(
      p5,
      new Circular(p5, 0.008, this.rotationCenter, this.canvasHeight * 0.7, p5.PI),
      150,
      p5.color(229, 229, 229),
      undefined,
      undefined,
      undefined,
      stroke,
    )

    this.sun = new Sun(
      p5,
      new Circular(p5, 0.008, this.rotationCenter, this.canvasHeight * 0.7),
      200,
      p5.color(255, 127, 81),
      undefined,
      undefined,
      undefined,
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

    this.landscape = [
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

    // Sun
    this.sun.draw();
    this.sun.translation.speed = Math.max(speed / 50 * 0.03, 0.006);

    // Moon
    this.moon.draw();
    this.moon.translation.speed = Math.max(speed / 50 * 0.03, 0.006);

    // Main mountain
    const mountain1 = this.mountain[0];
    const mountain2 = this.mountain[1];
    mountain1.draw((x) => this.p5.lerp(mountain1.apply(x), mountain2.apply(x), this.landscapeClock.percentage()));

    // Cordillera
    this.landscape.forEach((curve) => {
      curve.draw();
      // this.p5.blendMode(this.p5.SOFT_LIGHT);
      curve.phase += Math.max(speed / 50 * 0.01, 0.002);
    });

    this.landscapeClock.tick(() => {
      this.mountain = [mountain2, mountain1];
    })
    this.time += 0.01;

    // this.p5.blendMode(this.p5.MULTIPLY);
    // new LinearGradient(
    //   this.p5,
    //   0,
    //   0,
    //   this.canvasWidth,
    //   this.canvasHeight,
    //   [
    //     {
    //       color: this.p5.color(255, 58, 58),
    //       position: 0,
    //       length: 100,
    //     },
    //     {
    //       color: this.p5.color(0, 252, 255),
    //       position: Math.floor(this.canvasHeight * 0.43),
    //       length: 40,
    //     },
    //     {
    //       color: this.p5.color(24, 61, 138),
    //       position: this.canvasHeight,
    //       length: 0,
    //     },
    //   ]
    // ).draw()
    // this.p5.blendMode(this.p5.NORMAL);

  }
}
