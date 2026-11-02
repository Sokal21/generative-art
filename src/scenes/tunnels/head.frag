#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float travel;  // Cuánto se avanzó por el túnel.
uniform float twist;   // Giro acumulado.
uniform float opening; // 0 cerrado, 1 abierto: cambia la forma del fractal.
uniform float flash;   // 1 justo en un golpe, y cae a 0.
uniform float kick;    // Zoom corto de cada golpe.
uniform float hue;
uniform float morph;   // El slider Forma: deforma el fractal.
uniform float fade;    // Opacidad durante un fundido entre túneles.
uniform float brightness;
uniform float contrast;
uniform float saturation;
uniform float tinted;  // 1 usa colorA y colorB, 0 recorre todos los tonos.
uniform vec3 colorA;
uniform vec3 colorB;

const float TAU = 6.28318530718;

vec3 palette(float t) {
  if (tinted > 0.5) {
    // La mezcla de dos complementarios da gris: se pasa rápido por el medio.
    // Varias vueltas por tono, para que los dos se vean a la vez en la imagen.
    return mix(colorB, colorA, smoothstep(0.25, 0.75, 0.5 + 0.5 * cos(TAU * t * 3.0)));
  }
  return 0.5 + 0.5 * cos(TAU * (t + vec3(0.0, 0.33, 0.67)));
}

mat2 rotation(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}
