import p5 from "p5";

export class Curve {
  constructor(
    private readonly p5: p5,
    public amplitude: number,
    public period: number,
    public phase: number,
    public yOffset: number,
    private readonly modificator?: (x: number) => number,
    public color?: p5.Color
  ) {}

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

    // this.p5.noFill();
    this.p5.noStroke();

    for (let x = 0; x < canvasWidth; x++) {
      this.p5.vertex(x, this.apply(x) + this.yOffset);
    }

    this.p5.vertex(canvasWidth + 100, canvasHeight);
    this.p5.vertex(0, canvasWidth);

    this.p5.endShape();
  }
}

// function Wave() {
//   const seed = random();
//   return Array.from({ length: 400 }).map(
//     (_, x) =>
//       sin((x / 400) * -PI) * noise((x / 300) * PI, seed * 20) * 200 + 300
//   );
// }

// let a;
// let b;
// let it;
// const PERIOD = 500;

// function setup() {
//   createCanvas(400, 400);
//   a = Wave();
//   b = Wave();
//   console.log(a.every((x, i) => x === b[i]));
//   it = 0;
// }

// function draw() {
//   background(220);

//   beginShape();
//   noFill();

//   for (let x = 0; x < 400; x++) {
//     // line(index, 50, i * 4, 50 + sin(a) * 40.0);
//     y = lerp(a[x], b[x], it / PERIOD);
//     vertex(x, y);
//     // vertex(x, noise(x / 400 * PI) * 200);
//   }
//   it++;
//   if (it === PERIOD) {
//     a = b;
//     b = Wave();
//     it = 0;
//   }

//   endShape();
// }
