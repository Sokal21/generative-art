#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform sampler2D tex0;
uniform float drift;
uniform float level;
uniform float flash;
uniform float kick;
uniform float glitch;
uniform float seed;
uniform vec3 accent;
uniform float brightness;
uniform float contrast;
uniform float saturation;

const vec3 SECOND = vec3(0.08, 0.88, 1.0);
const float LED_PX = 7.0;
const float BEAMS = 10.0;
const vec2 EYES = vec2(0.122, 0.413); // Distancia al centro y altura, medidas en la foto.

float hash2(vec2 n) {
  return fract(sin(dot(n, vec2(127.1, 311.7))) * 43758.5453);
}

// Lee la foto en coordenadas de la imagen. Fuera de la cara da negro.
float face(vec2 uv) {
  vec3 c = texture2D(tex0, uv).rgb;
  float light = dot(c, vec3(0.299, 0.587, 0.114));
  vec2 oval = (uv - vec2(0.5, 0.46)) / vec2(0.43, 0.52);
  return smoothstep(0.22, 0.95, light) * smoothstep(1.0, 0.72, length(oval));
}

// Láseres que bajan del techo y barren la pista.
vec3 lasers(vec2 p) {
  vec3 color = vec3(0.0);
  for (float i = 0.0; i < BEAMS; i += 1.0) {
    float side = mod(i, 2.0) * 2.0 - 1.0;
    vec2 from = vec2(side * 0.7, 0.62);
    float angle = sin(drift * (0.7 + i * 0.09) + i * 1.7) * 0.75;
    vec2 dir = vec2(sin(angle), -cos(angle));
    vec2 to = p - from;
    float gap = abs(to.x * dir.y - to.y * dir.x);
    float along = max(dot(to, dir), 0.0);
    color += (side > 0.0 ? accent : SECOND) * 0.0022 / (gap + 0.0022) * exp(-0.7 * along);
  }
  return color * (0.25 + 0.9 * level + 1.2 * flash);
}

// Los puntitos de la bola de espejos, dando vueltas por las paredes.
vec3 mirrorBall(vec2 p) {
  vec2 grid = p * 9.0 + vec2(drift * 0.55, sin(drift * 0.2) * 0.4);
  vec2 cell = floor(grid);
  float chance = hash2(cell);
  if (chance < 0.6) return vec3(0.0);
  float dot_ = smoothstep(0.13, 0.03, length(fract(grid) - 0.5));
  return mix(vec3(1.0), chance > 0.8 ? accent : SECOND, 0.6) * dot_ * 0.3 * (0.4 + level);
}

void main() {
  // Pared de LEDs: cada punto muestra un solo valor, y disimula que la foto es chica.
  vec2 led = (floor(gl_FragCoord.xy / LED_PX) + 0.5) * LED_PX;
  vec2 p = (led - 0.5 * resolution.xy) / min(resolution.x, resolution.y);

  if (glitch > 0.01) {
    float slice = fract(sin((floor(p.y * 14.0) + seed) * 127.1) * 43758.5453);
    if (slice < 0.35) p.x += (slice - 0.17) * 0.7 * glitch;
  }

  // La cara al centro y copias más chiquitas y oscuras a los costados, si la pantalla da.
  float size = 1.02 * (1.0 + 0.1 * kick + 0.04 * level);
  vec2 at = p / size;
  at.y += 0.02 * sin(drift * 0.8);
  float cellWidth = 1.05;
  float column = floor(at.x / cellWidth + 0.5);
  vec2 local = vec2(at.x - column * cellWidth, at.y);
  vec2 uv = vec2(0.5 + local.x * (mod(column, 2.0) < 0.5 ? 1.0 : -1.0), 0.5 - local.y);
  float inFrame = step(abs(local.x), 0.5) * step(abs(local.y), 0.5);

  // Cada canal se corre con el golpe: la imagen se abre en colores.
  float split = 0.006 + 0.03 * flash + 0.04 * glitch;
  float main_ = face(uv) * inFrame;
  float toward = face(uv + vec2(split, 0.0)) * inFrame;
  float away = face(uv - vec2(split, 0.0)) * inFrame;
  float presence = column == 0.0 ? 1.0 : 0.3 + 0.35 * level;

  vec3 image = accent * toward + SECOND * away + vec3(1.0) * main_ * main_ * main_ * 0.6;
  // Barrido de luz que sube por la cara.
  image *= 0.75 + 0.5 * smoothstep(0.75, 1.0, sin(uv.y * 7.0 + drift * 2.5));
  image *= presence;

  vec3 color = lasers(p) + mirrorBall(p) + image;

  if (column == 0.0) {
    vec2 eye = vec2(abs(uv.x - 0.5), uv.y) - EYES;
    color += mix(accent, vec3(1.0), 0.4) * 0.003 / (dot(eye, eye) + 0.0025) * (0.1 + 0.5 * level + 1.2 * flash);
  }

  color *= 1.0 + 0.6 * flash;
  vec2 cellAt = fract(gl_FragCoord.xy / LED_PX) - 0.5;
  color *= smoothstep(0.56, 0.3, length(cellAt));

  color = color / (1.0 + 0.3 * color);

  // Los controles del panel, sobre la imagen ya terminada.
  color = (color - 0.5) * contrast + 0.5;
  color = mix(vec3(dot(color, vec3(0.299, 0.587, 0.114))), color, saturation);
  gl_FragColor = vec4(clamp(color * brightness, 0.0, 1.0), 1.0);
}
