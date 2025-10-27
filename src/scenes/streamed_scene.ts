import p5 from "p5";
import { Scene } from ".";

export class StreamedScene implements Scene {
  private videoElement: HTMLVideoElement;

  constructor(
    public p5: p5,
    private readonly canvasWidth: number,
    private readonly canvasHeight: number,
    private readonly stream: MediaStream
  ) {
    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.style.position = 'absolute';
    this.videoElement.style.top = '0';
    this.videoElement.style.left = '0';
    this.videoElement.style.width = '100%';
    this.videoElement.style.height = '100%';
    this.videoElement.style.objectFit = 'cover';
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    
    // Set the stream as the video source
    this.videoElement.srcObject = this.stream;
    
    // Add video element to the document
    document.body.appendChild(this.videoElement);
  }

  delete(): void {
    // Remove video element
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
    }
    // Stop all tracks in the stream
    this.stream.getTracks().forEach((track) => track.stop());
  }

  draw(): void {
    // No need to draw anything since the video element is directly in the DOM
  }
}
