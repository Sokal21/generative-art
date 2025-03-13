import p5 from "p5";
import { Scene } from ".";

export class Beater implements Scene {
  constructor(
    public p5: p5,
    private readonly canvasWidth: number,
    private readonly canvasHeight: number
  ) {}

  delete(): void {}

  draw(): void {
    this.p5.fill(0);
    this.p5.ellipse(10, 20, 30);
  }
}
