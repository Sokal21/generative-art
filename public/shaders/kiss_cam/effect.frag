#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D tex0;
uniform vec2 resolution;
uniform float time;
uniform vec2 offset;  // En la cámara sigue al micrófono: los corazones laten con el sonido.

const vec3 HOT_PINK = vec3(1.0, 0.11, 0.48);
const vec3 SOFT_PINK = vec3(1.0, 0.62, 0.78);
const vec3 DEEP_RED = vec3(0.72, 0.02, 0.2);
const float FRAME = 0.075;
const float CELL = 0.1;

float random(float n) {
  return fract(sin(n * 91.345) * 47453.5453);
}

float dot2(vec2 v) {
  return dot(v, v);
}

// Distancia a un corazón de alto ~1 centrado en el origen. Negativa adentro.
float heart(vec2 p) {
  p.y += 0.5;
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

// Tipografía de 5x7: cada fila son 5 bits. Las cuatro de arriba van en un número
// y las tres de abajo en otro, porque las 7 juntas no entran en un float.
vec2 glyph(float index) {
  if (index < 0.5) return vec2(576152.0, 21073.0);  // K
  if (index < 1.5) return vec2(462980.0, 4238.0);   // I
  if (index < 3.5) return vec2(508430.0, 1086.0);   // S S
  if (index < 4.5) return vec2(0.0, 0.0);           // espacio
  if (index < 5.5) return vec2(476688.0, 16942.0);  // C
  if (index < 6.5) return vec2(476735.0, 17969.0);  // A
  return vec2(585397.0, 17969.0);                   // M
}

// "KISS CAM" en puntos de tablero de estadio. `p` va en puntos desde abajo a la izquierda.
float scoreboardText(vec2 p) {
  if (p.x < 0.0 || p.x >= 47.0 || p.y < 0.0 || p.y >= 7.0) return 0.0;
  float column = floor(p.x);
  float inChar = mod(column, 6.0);
  if (inChar > 4.5) return 0.0;

  vec2 rows = glyph(floor(column / 6.0));
  float row = 6.0 - floor(p.y);
  float group = row < 3.5 ? rows.x : rows.y;
  float shift = row < 3.5 ? 3.0 - row : 6.0 - row;
  float bits = mod(floor((group + 0.5) / pow(32.0, shift)), 32.0);
  float lit = mod(floor((bits + 0.5) / pow(2.0, 4.0 - inChar)), 2.0);
  return lit * smoothstep(0.5, 0.36, length(fract(p) - 0.5));
}

// Pinta `color` sobre `base` donde la distancia sea negativa, con borde suave.
vec3 paint(vec3 base, vec3 color, float dist, float alpha) {
  return mix(base, color, alpha * smoothstep(0.002, -0.002, dist));
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv.y = 1.0 - uv.y;
  float aspect = resolution.x / resolution.y;
  // Centrado, con y de -0.5 a 0.5 y sin deformar por el formato de la pantalla.
  vec2 p = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;

  float sound = clamp(offset.x * 5.0, 0.0, 1.0);
  float beat = pow(0.5 + 0.5 * sin(time * 5.0), 3.0);
  float pulse = 1.0 + 0.06 * beat + 0.2 * sound;

  // Imagen con tono cálido y bordes rosados.
  vec3 color = texture2D(tex0, uv).rgb;
  color = mix(color, color * vec3(1.15, 0.9, 0.98), 0.8);
  float edge = length((uv - 0.5) * vec2(1.0, 0.9));
  color = mix(color, HOT_PINK * 0.55, smoothstep(0.38, 0.8, edge) * 0.8);

  // Corazón grande que encuadra a la pareja: solo el contorno, para no taparla.
  float big = heart((p - vec2(0.0, 0.04)) / (0.62 * pulse)) * 0.62 * pulse;
  color += HOT_PINK * 0.35 * smoothstep(0.03, 0.0, abs(big));
  color = paint(color, SOFT_PINK, abs(big) - 0.0035, 0.95);

  // Corazones que suben.
  for (float i = 0.0; i < 16.0; i += 1.0) {
    float seed = i + 1.0;
    float rise = 0.05 + 0.07 * random(seed);
    float y = mod(time * rise + random(seed * 2.0), 1.0);
    float x = (random(seed * 3.0) - 0.5) * (aspect - 2.0 * FRAME) + 0.025 * sin(time + seed);
    float size = (0.035 + 0.05 * random(seed * 4.0)) * pulse;
    float fade = smoothstep(0.0, 0.12, y) * smoothstep(1.0, 0.65, y);
    vec2 center = vec2(x, y * 1.1 - 0.55);
    vec3 tint = mod(i, 2.0) < 0.5 ? HOT_PINK : SOFT_PINK;
    color = paint(color, tint, heart((p - center) / size) * size, 0.8 * fade);
  }

  // Marco de corazones que laten por turnos.
  float toTop = 0.5 - abs(p.y);
  float toSide = 0.5 * aspect - abs(p.x);
  if (min(toTop, toSide) < FRAME) {
    color = mix(DEEP_RED, HOT_PINK, 0.25 + 0.2 * beat);
    bool horizontal = toTop < toSide;
    float along = horizontal ? p.x : p.y;
    float cell = floor(along / CELL);
    float local = (fract(along / CELL) - 0.5) * CELL;
    vec2 q = horizontal
      ? vec2(local, p.y - sign(p.y) * (0.5 - 0.5 * FRAME))
      : vec2(p.x - sign(p.x) * (0.5 * aspect - 0.5 * FRAME), local);
    // Las esquinas llevan un corazón propio para que no quede cortado en diagonal.
    if (max(toTop, toSide) < FRAME) {
      q = p - sign(p) * (vec2(0.5 * aspect, 0.5) - 0.5 * FRAME);
    }
    float size = 0.05 * (mod(cell, 2.0) < 0.5 ? pulse : 2.0 - pulse);
    color = paint(color, SOFT_PINK, heart(q / size) * size, 1.0);
  }

  // Cartel. Se achica si en una pantalla vertical no entra.
  float dotSize = min(0.0105, aspect * 0.76 / 47.0);
  vec2 signSize = vec2(23.5, 3.5) * dotSize + vec2(0.012);
  vec2 signCenter = vec2(0.0, -0.5 + FRAME + signSize.y + 0.015);
  vec2 inSign = abs(p - signCenter) - signSize;
  float signShape = length(max(inSign, 0.0)) + min(max(inSign.x, inSign.y), 0.0) - 0.008;
  color = paint(color, vec3(0.1, 0.0, 0.05), signShape, 0.92);
  color = paint(color, HOT_PINK, abs(signShape) - 0.002, 1.0);

  // Titila entre blanco y amarillo, como los tableros.
  vec3 lamp = mix(vec3(1.0), vec3(1.0, 0.85, 0.25), step(0.5, fract(time * 1.5)));
  vec2 textStart = signCenter - vec2(23.5, 3.5) * dotSize;
  color = mix(color, lamp, scoreboardText((p - textStart) / dotSize));

  gl_FragColor = vec4(color, 1.0);
}
