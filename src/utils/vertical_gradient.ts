import p5 from "p5";

export class VerticalGradient {
    public transitionHeight: number;
    public endTransitionPointHeight: number;

    constructor(
        private readonly p5: p5,
        public x: number,
        public y: number,
        public width: number,
        public height: number,
        public color1: p5.Color,
        public color2: p5.Color,
        transitionHeight?: number,
        endTransitionPointHeight?: number,
    ) {
        if (!transitionHeight) {
            this.transitionHeight = this.height;
        } else {
            this.transitionHeight = transitionHeight;
        }

        if (!endTransitionPointHeight) {
            this.endTransitionPointHeight = this.height;
        } else {
            this.endTransitionPointHeight = endTransitionPointHeight;
        }
    }

    draw() {
        this.p5.strokeWeight(2);

        for (let i = 0; i < Math.min(this.height, this.endTransitionPointHeight); i++) {
            let c: p5.Color;

            // if (i < this.endTransitionPointHeight - this.transitionHeight) {
            //     c = this.color1
            // } else {
            const inter = this.p5.map(i, this.endTransitionPointHeight - this.transitionHeight, this.endTransitionPointHeight, 0, 1);
            c = this.p5.lerpColor(this.color1, this.color2, inter);
            // }

            this.p5.stroke(c);
            this.p5.line(this.x, i + this.y, this.x + this.width, i + this.y);
        }

        for (let i = this.endTransitionPointHeight; i < this.height; i++) {
            let c: p5.Color;

            // if (i > this.endTransitionPointHeight + this.transitionHeight) {
            //     c = this.color1
            // } else {
            const inter = this.p5.map(i, this.endTransitionPointHeight, this.endTransitionPointHeight + this.transitionHeight, 0, 1);
            c = this.p5.lerpColor(this.color2, this.color1, inter);
            // }

            this.p5.stroke(c);
            this.p5.line(this.x, i + this.y, this.x + this.width, i + this.y);
        }
    }
}