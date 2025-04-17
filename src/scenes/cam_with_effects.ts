import p5 from "p5";
import { Scene } from ".";
import { Microphone } from "../inputs/microphone";

export class CamWithEffects implements Scene {
  time = 0;
  seriously: any;
  capture: p5.Element;
  constructor(
    public p5: p5,
    private readonly canvasWidth: number,
    private readonly canvasHeight: number, // private readonly minYchange: number,
    private readonly microphone: Microphone,
    private readonly myShader: p5.Shader
  ) {
    this.capture = this.p5.createCapture("video");
    this.capture.size(this.canvasWidth, this.canvasHeight);
    this.capture.hide();    
  }

  delete() { }

  draw(): void {
    this.p5.shader(this.myShader);

    // Get microphone volume and map it to a speed range
    const micLevel = this.microphone.getAverageVolume() / 255; // Normalize to 0-1 range
    // Map volume (0-1) to speed (0.5-3.0)
    const speed = this.p5.map(micLevel, 0, 1, 0.5, 10.0, true);

    this.myShader.setUniform('tex0', this.capture as any);
    this.myShader.setUniform('resolution', [this.canvasWidth, this.canvasHeight]);
    this.myShader.setUniform('mouse', [this.p5.mouseX, this.p5.mouseY]);
    this.myShader.setUniform('time', this.p5.millis() / 1000.0);
    this.myShader.setUniform('speed', speed);
    this.p5.rect(-this.canvasWidth/2, -this.canvasHeight/2, this.canvasWidth, this.canvasHeight);
  }
}
