import { Scene } from ".";

/**
 * Muestra un stream remoto. El <video> va directo al DOM, encima del canvas:
 * es más barato que pasar cada frame por p5.
 */
export class StreamScene implements Scene {
  private video = document.createElement("video");

  constructor() {
    this.video.className = "stream";
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
    document.body.appendChild(this.video);
  }

  attach(stream: MediaStream | null) {
    this.video.srcObject = stream;
  }

  resize() {
    // El CSS lo mantiene a pantalla completa.
  }

  dispose() {
    this.video.srcObject = null;
    this.video.remove();
  }

  draw() {}
}
