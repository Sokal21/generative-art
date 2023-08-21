import p5 from "p5";
import { Stroke } from "./stroke";
import { Clock } from "./clock";

export class Sun {
  constructor(
    private readonly p5: p5,
    public x: number,
    public y: number,
    public radius: number,
    public color: p5.Color,
    public maxRadius?: number,
    public secondaryColor?: p5.Color,
    public clock?: Clock,
    public stroke?: Stroke,
  ) {
  }

  invert() {
    const radius = this.radius;
    const color = this.color;

    if (this.secondaryColor) {
      this.color = this.secondaryColor;
      this.secondaryColor = color
    }

    if (this.maxRadius) {
      this.radius = this.maxRadius;
      this.maxRadius = radius;
    }
  }

  draw() {
    const h = this.clock ? this.p5.lerp(this.radius, this.maxRadius || this.radius, this.clock.percentage()) : this.radius;
    const color = this.clock ? this.p5.lerpColor(this.color, this.secondaryColor || this.color, this.clock.percentage()) : this.color;

    this.p5.fill(color);
    this.stroke?.draw();
    this.p5.ellipse(this.x, this.y, h, h)
  }
}
