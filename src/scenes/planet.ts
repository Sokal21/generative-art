import p5 from "p5";
import { Scene } from ".";

export class Planet implements Scene {
    texture: p5.Graphics;

    constructor(
        public p5: p5,
        private readonly width: number,
    ) {
        this.texture = p5.createGraphics(400, 400)
        this.texture.background(0)
    }

    dispose(): void {
        this.texture.remove()
    }

    draw(): void {
        this.texture.fill(255)
        this.texture.noStroke()
        this.texture.circle(
            this.p5.random(this.texture.width),
            this.p5.random(this.texture.height),
            this.p5.random(1, 10),
        )

        this.p5.noStroke()
        this.p5.rotateY(this.p5.frameCount * 0.003)
        this.p5.texture(this.texture);
        this.p5.sphere(this.width / 4);
    }
}