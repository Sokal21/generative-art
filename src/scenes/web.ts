import { Scene } from ".";

/** Muestra una página en un iframe a pantalla completa, encima del canvas. */
export class WebScene implements Scene {
  private frame = document.createElement("iframe");

  constructor(url: string) {
    this.frame.className = "web";
    this.frame.src = url;
    this.frame.allow = "autoplay; fullscreen";
    // Al principio del body, para que los avisos de la pantalla queden encima.
    document.body.prepend(this.frame);
  }

  resize() {
    // El CSS lo mantiene a pantalla completa.
  }

  dispose() {
    this.frame.remove();
  }

  draw() {}
}
