import p5 from 'p5';
import { Scene } from '.';
import { Microphone } from '../inputs/microphone';

export class LifeGameScene implements Scene {
    p5: p5;
    private cellSize: number;

    constructor(
        p5: p5,
        private readonly canvasWidth: number,
        private readonly canvasHeight: number,
        private readonly myShader: p5.Shader,
        private readonly microphone: Microphone,
        private readonly capture: p5.Element
    ) {
        this.p5 = p5;
        this.cellSize = 10;

        this.p5.background(0);
        this.p5.fill(255, 0, 0);
        this.p5.noStroke();
        
        // Add some random cells
        for(let x = 0; x < this.canvasWidth; x += this.cellSize) {
            for(let y = 0; y < this.canvasHeight; y += this.cellSize) {
                if(this.p5.random() > 0.95) {
                    this.p5.rect(x, y, this.cellSize, this.cellSize);
                }
            }
        }
    }

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
    }

    delete(): void {
    }
} 