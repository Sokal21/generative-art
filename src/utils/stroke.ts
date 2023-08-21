import p5 from "p5";

export class Stroke {
    constructor(
        private readonly p5: p5,
        public color: p5.Color,
        public weight: number,
    ) { }

    draw() {
        this.p5.stroke(this.color);
        this.p5.strokeWeight(this.weight);
    }
}