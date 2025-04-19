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
    private readonly myShader: p5.Shader,
    private readonly uniforms?: Record<string, number | number[]>
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
    // Map volume (0-1) to offset (0 to 0.2)
    const offset = this.p5.map(micLevel, 0, 1, 0, 0.2, true);

    this.myShader.setUniform('tex0', this.capture as any);
    this.myShader.setUniform('resolution', [this.canvasWidth, this.canvasHeight]);
    this.myShader.setUniform('offset', [offset, offset]);
    this.myShader.setUniform('time', this.p5.millis() / 1000.0);
    this.myShader.setUniform('speed', speed);
    if (this.uniforms) {
      Object.entries(this.uniforms).forEach(([key, value]) => {
        this.myShader.setUniform(key, value);
      });
    }
    this.p5.rect(-this.canvasWidth/2, -this.canvasHeight/2, this.canvasWidth, this.canvasHeight);
  }
}
