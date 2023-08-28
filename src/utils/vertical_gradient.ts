import p5 from "p5";

interface GradientColor {
    color: p5.Color,
    position: number,
    length: number,
}

export class VerticalGradient {
    public colors: GradientColor[];

    constructor(
        private readonly p5: p5,
        public x: number,
        public y: number,
        public width: number,
        public height: number,
        colors: GradientColor[],
    ) {
        if (colors.length < 2) {
            throw new Error("Gradient should have at least one color")
        }

        this.colors = colors.sort((c1, c2) => c2.position - c1.position)
    }

    draw() {
        this.p5.strokeWeight(2);

        const colorsArray = this.colors;
        let offset = 0;
        let color = colorsArray.pop();
        let prevColor = color;

        while (color && prevColor) {
            let c: p5.Color;

            if ((color.position - color.length) <= offset && offset <= (color.position + color.length)) {
                c = color.color;

                if (offset === color.position + color.length) {
                    prevColor = color;
                    color = colorsArray.pop();
                }
            } else {
                const inter = this.p5.map(offset, prevColor.position + prevColor.length, color.position - color.length, 0, 1);
                c = this.p5.lerpColor(prevColor.color, color.color, inter);
            }

            this.p5.stroke(c);
            this.p5.line(this.x, offset + this.y, this.x + this.width, offset + this.y);

            offset++;
        }

        // for (let i = 0; i < Math.min(this.height, this.endTransitionPointHeight); i++) {
        //     let c: p5.Color;

        //     // if (i < this.endTransitionPointHeight - this.transitionHeight) {
        //     //     c = this.color1
        //     // } else {
        //     const inter = this.p5.map(i, this.endTransitionPointHeight - this.transitionHeight, this.endTransitionPointHeight, 0, 1);
        //     c = this.p5.lerpColor(this.color1, this.color2, inter);
        //     // }

        //     this.p5.stroke(c);
        //     this.p5.line(this.x, i + this.y, this.x + this.width, i + this.y);
        // }

        // for (let i = this.endTransitionPointHeight; i < this.height; i++) {
        //     let c: p5.Color;

        //     // if (i > this.endTransitionPointHeight + this.transitionHeight) {
        //     //     c = this.color1
        //     // } else {
        //     const inter = this.p5.map(i, this.endTransitionPointHeight, this.endTransitionPointHeight + this.transitionHeight, 0, 1);
        //     c = this.p5.lerpColor(this.color2, this.color1, inter);
        //     // }

        //     this.p5.stroke(c);
        //     this.p5.line(this.x, i + this.y, this.x + this.width, i + this.y);
        // }
    }
}