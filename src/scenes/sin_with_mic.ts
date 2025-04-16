import p5 from "p5";
import { Scene } from ".";
import { Microphone } from "../inputs/microphone";

export class SinWithMic implements Scene {
  time = 0;

  constructor(
    public p5: p5,
    private readonly canvasWidth: number,
    private readonly canvasHeight: number, // private readonly minYchange: number,
    private readonly microphone: Microphone,
  ) {
    this.p5.rectMode(this.p5.CENTER);
    this.p5.angleMode(this.p5.DEGREES);
  }

  delete() { }

  draw(): void {
    this.p5.noFill()
    this.p5.stroke(255)
    this.p5.strokeWeight(3)

    this.p5.translate(0, -100, -800)
    
    this.p5.rotateX(50)
    this.p5.background(0)

    for (var n = 0; n < 50; n++) {
        this.p5.push()
        this.p5.beginShape()
        for (var i = 0; i < 360; i += 3) {
            const volume = this.microphone.getAverageVolume();
            const speedMultiplier = this.p5.map(volume, 0, 255, 1, 5); // Map volume to speed multiplier

            var rad = n * 16
            var x = rad * this.p5.cos(i);
            var y = rad * this.p5.sin(i);
            var z = this.p5.map(this.p5.cos(this.p5.frameCount * speedMultiplier + n * 10), 0, 1, -50, 50)

            this.p5.vertex(x, y, z)
            
        }
        this.p5.endShape(this.p5.CLOSE)
        this.p5.pop()
    }

    this.time += 0.05
  }
}
