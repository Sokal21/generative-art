import p5 from "p5";
import { Scene } from ".";
import { Microphone } from "../inputs/microphone";

export class VideoWithEffect implements Scene {
    private video: p5.MediaElement;
    private baseSpeed: number;
    private currentSpeed: number;
    private brightness: number;
    private contrast: number;
    private saturation: number;
    private distortion: number;

    constructor(
        public p5: p5,
        private readonly canvasWidth: number,
        private readonly canvasHeight: number,
        private readonly microphone: Microphone,
        private readonly myShader: p5.Shader | undefined,
        private readonly videoUrl: string,
        private readonly uniforms?: Record<string, number | number[]>
    ) {
        this.baseSpeed = 1.0;
        this.currentSpeed = this.baseSpeed;
        this.brightness = 1.0;
        this.contrast = 1.0;
        this.saturation = 1.0;
        this.distortion = 0.0;

        // Create and load the video
        this.video = this.p5.createVideo(videoUrl);
        this.video.hide();
        this.video.volume(0); // Mute the video since we're controlling speed with audio

        // Handle video play errors
        this.video.elt.onerror = (e: Event) => {
            console.error('Video error:', e);
        };

        // Ensure video plays when visible
        const playVideo = async () => {
            try {
                this.video.loop();
            } catch (error) {
                console.warn('Video play error:', error);
                // Try to play again after a short delay
                setTimeout(playVideo, 1000);
            }
        };

        // Start playing when the video is loaded
        this.video.elt.onloadeddata = () => {
            playVideo();
        };

        // Setup keyboard controls
        this.setupKeyboardControls();
    }

    private setupKeyboardControls(): void {
        // Brightness controls (B key)
        this.p5.keyPressed = () => {
            if (this.p5.key === 'b' || this.p5.key === 'B') {
                this.brightness = this.p5.key === 'b' ? 
                    Math.max(0.0, this.brightness - 0.1) : 
                    Math.min(2.0, this.brightness + 0.1);
            }
            // Contrast controls (C key)
            else if (this.p5.key === 'c' || this.p5.key === 'C') {
                this.contrast = this.p5.key === 'c' ? 
                    Math.max(0.0, this.contrast - 0.1) : 
                    Math.min(2.0, this.contrast + 0.1);
            }
            // Saturation controls (S key)
            else if (this.p5.key === 's' || this.p5.key === 'S') {
                this.saturation = this.p5.key === 's' ? 
                    Math.max(0.0, this.saturation - 0.1) : 
                    Math.min(2.0, this.saturation + 0.1);
            }
            // Distortion controls (D key)
            else if (this.p5.key === 'd' || this.p5.key === 'D') {
                this.distortion = this.p5.key === 'd' ? 
                    Math.max(0.0, this.distortion - 0.1) : 
                    Math.min(1.0, this.distortion + 0.1);
            }
        };
    }

    delete(): void {
        if (this.video) {
            this.video.pause();
            this.video.remove();
        }
    }

    draw(): void {
        if (this.myShader !== undefined) {
            this.p5.shader(this.myShader);
        }
        // Get microphone volume and map it to a speed range
        const micLevel = this.microphone.getAverageVolume(); // Normalize to 0-1 range
        // Map volume (0-1) to speed (0.5-3.0)
        // const speed = this.p5.map(micLevel / 50, 0, 1, 1, 5, true);

        // Update video speed based on microphone volume
        this.video.speed(1.5);

        // Set shader uniforms
        if (this.myShader !== undefined) {
            this.myShader.setUniform('tex0', this.video as any);
            this.myShader.setUniform('resolution', [this.canvasWidth, this.canvasHeight]);
            this.myShader.setUniform('time', this.p5.millis() / 1000.0);
            this.myShader.setUniform('speed', 1.5);
            this.myShader.setUniform('brightness', this.brightness);
            this.myShader.setUniform('contrast', this.contrast);
            this.myShader.setUniform('saturation', this.saturation);
            this.myShader.setUniform('distortion', this.distortion);

            // Set any additional uniforms
            if (this.uniforms) {
                Object.entries(this.uniforms).forEach(([key, value]) => {
                    this.myShader?.setUniform(key, value);
                });
            }
        }

        this.p5.image(this.video, 0, 0, this.canvasWidth, this.canvasHeight);
    }
}
