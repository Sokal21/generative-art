import p5 from "p5";
import { Traslation } from ".";

export class Circular extends Traslation {
    constructor(
        public p5: p5,
        speed: number,
        public center: p5.Vector,
        public radius: number,
        public initialRadius: number = 0,
    ) {
        super(speed);
    }

    private theta(t: number) {
        return this.initialRadius + (this.p5.TWO_PI * t / 10)
    }

    private rotation(t: number): p5.Vector {
        const r = this.radius;

        return this.p5.createVector(
            this.center.x + r * this.p5.cos(this.theta(t)),
            this.center.y + r * this.p5.sin(this.theta(t)),
        )
    }

    calculatePosition(time: number): p5.Vector {
        return this.rotation(time);
    }
}