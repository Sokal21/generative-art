#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform vec3 eye;      // Dónde está la cámara.
uniform float aim;     // Altura a la que mira.
uniform float focal;
uniform float drift;   // Tiempo acumulado: corre más rápido con la música.
uniform float jaw;     // Cuánto se abre la mandíbula.
uniform float level;   // 0 en silencio, 1 a todo lo que venía sonando.
uniform float flash;   // 1 justo en un golpe, y cae a 0.
uniform float kick;    // Zoom corto de cada golpe.
uniform float glitch;  // Tajos de imagen corridos, en los golpes marcados.
uniform float seed;    // Cambia con cada golpe, para que el glitch no se repita.
uniform float figure;  // 0 calavera, 1 demonio, 2 ángel, 3 androide, 4 criatura.
uniform vec3 accent;
uniform float brightness;
uniform float contrast;
uniform float saturation;

const float MARCH_STEPS = 52.0;
const float MARCH_FAR = 9.0;
const float BOUND = 2.4;
const float FRAMES = 6.0;
const vec3 EYE_SOCKET = vec3(0.29, 0.02, 0.62);

float hash(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

float hash2(vec2 n) {
  return fract(sin(dot(n, vec2(127.1, 311.7))) * 43758.5453);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}

float ellipsoid(vec3 q, vec3 r) {
  float k0 = length(q / r);
  float k1 = length(q / (r * r));
  return k0 * (k0 - 1.0) / k1;
}

float box(vec3 q, vec3 size) {
  vec3 d = abs(q) - size;
  return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

float capsule(vec3 q, vec3 a, vec3 b, float r) {
  vec3 pa = q - a;
  vec3 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r;
}

// Una hilera de dientes sobre un arco. Llega con x ya espejada.
float teeth(vec3 q, float height) {
  float radius = length(q.xz - vec2(0.0, 0.3));
  float angle = atan(q.x, q.z - 0.3);
  float cell = 0.16;
  float center = (floor(min(angle, 1.04) / cell) + 0.5) * cell;
  return box(vec3((angle - center) * radius, q.y - height, radius - 0.44), vec3(0.024, 0.062, 0.035)) - 0.008;
}

// Un bebé anciano de otro mundo: cabeza enorme, cara chiquita, aletas y cresta.
float creature(vec3 q) {
  float d = ellipsoid(q - vec3(0.0, 0.3, -0.05), vec3(0.98, 0.86, 0.9));
  d = smin(d, ellipsoid(q - vec3(0.0, -0.32, 0.3), vec3(0.5, 0.42, 0.42)), 0.2);
  d = smin(d, ellipsoid(q - vec3(0.0, -0.17, 0.74), vec3(0.075, 0.06, 0.07)), 0.07);

  // Ojos grandes y hundidos, con el párpado arriba.
  d = smax(d, -ellipsoid(q - vec3(0.34, 0.02, 0.84), vec3(0.27, 0.23, 0.2)), 0.05);
  d = min(d, ellipsoid(q - vec3(0.34, 0.02, 0.62), vec3(0.23, 0.2, 0.14)));

  // Boca: apenas una línea.
  d = smax(d, -ellipsoid(q - vec3(0.0, -0.42, 0.7), vec3(0.15, 0.012, 0.1)), 0.015);

  // Aleta a cada costado, tirada para atrás, y cresta sobre la cabeza.
  vec3 fin = q - vec3(1.0, 0.25, -0.35);
  fin.xz = mat2(0.8, 0.6, -0.6, 0.8) * fin.xz;
  d = smin(d, ellipsoid(fin, vec3(0.55, 0.3, 0.035)), 0.1);
  for (float i = 0.0; i < 3.0; i += 1.0) {
    vec3 crest = q - vec3(0.0, 1.12 - i * 0.08, 0.25 - i * 0.42);
    d = smin(d, ellipsoid(crest, vec3(0.025, 0.2 - i * 0.03, 0.2)), 0.05);
  }

  // Cuello finito y hombros.
  d = smin(d, capsule(q, vec3(0.0, -0.6, 0.1), vec3(0.0, -1.0, 0.0), 0.16), 0.1);
  return smin(d, ellipsoid(q - vec3(0.0, -1.32, -0.05), vec3(0.72, 0.3, 0.38)), 0.14);
}

float map(vec3 q) {
  q.x = abs(q.x);
  if (figure > 3.5) {
    float reach = length(q - vec3(0.0, -0.15, -0.05)) - 1.9;
    return reach > 0.25 ? reach : creature(q);
  }

  // Lejos de la cabeza alcanza con la distancia a una esfera: es lo que deja llegar a 60 cuadros.
  float far = length(q - vec3(0.0, figure > 0.5 && figure < 2.5 ? 0.45 : -0.05, 0.05)) -
    (figure > 0.5 && figure < 2.5 ? 1.75 : 1.4);
  if (far > 0.25) return far;

  float d = ellipsoid(q - vec3(0.0, 0.38, -0.12), vec3(0.86, 0.82, 1.0));
  d = smin(d, ellipsoid(q - vec3(0.0, -0.05, 0.28), vec3(0.62, 0.62, 0.58)), 0.2);
  // Sienes hundidas: lo que hace que se lea como cráneo y no como huevo.
  d = smax(d, -ellipsoid(q - vec3(0.92, -0.02, 0.22), vec3(0.32, 0.36, 0.42)), 0.12);
  d = smin(d, ellipsoid(q - vec3(0.46, -0.22, 0.48), vec3(0.2, 0.15, 0.24)), 0.1);
  d = smin(d, capsule(q, vec3(0.5, -0.2, 0.42), vec3(0.72, -0.1, 0.02), 0.05), 0.08);
  d = smin(d, ellipsoid(q - vec3(0.0, -0.5, 0.46), vec3(0.36, 0.22, 0.3)), 0.1);

  // Órbitas y arco de la ceja.
  d = smax(d, -ellipsoid(q - vec3(0.29, 0.02, 0.76), vec3(0.2, 0.18, 0.24)), 0.04);
  d = smin(d, capsule(q, vec3(0.08, 0.22, 0.74), vec3(0.46, 0.21, 0.6), 0.035), 0.08);

  // Nariz: un triángulo invertido.
  vec3 nose = q - vec3(0.0, -0.2, 0.82);
  d = smax(d, -max(max(q.x * 0.92 + nose.y * 0.34 - 0.04, -nose.y - 0.13), abs(nose.z) - 0.3), 0.025);

  d = min(d, teeth(q, -0.68));

  if (figure > 0.5 && figure < 1.5) {
    // Cuernos: tres tramos que salen de la frente, se abren y vuelven a subir.
    float horn = capsule(q, vec3(0.42, 0.72, 0.28), vec3(0.8, 1.02, 0.2), 0.17);
    horn = smin(horn, capsule(q, vec3(0.8, 1.02, 0.2), vec3(1.0, 1.42, 0.12), 0.11), 0.14);
    horn = smin(horn, capsule(q, vec3(1.0, 1.42, 0.12), vec3(0.9, 1.86, 0.08), 0.03), 0.14);
    d = smin(d, horn, 0.08);
  } else if (figure > 1.5 && figure < 2.5) {
    // Aureola.
    vec3 ring = q - vec3(0.0, 1.42, -0.1);
    d = min(d, length(vec2(length(vec2(ring.x, ring.z)) - 0.78, ring.y)) - 0.028);
  }

  // Mandíbula: una U que baja con el sonido.
  vec3 chin = q - vec3(0.0, -0.76 - jaw, 0.22);
  float bone = ellipsoid(chin, vec3(0.44, 0.16, 0.52));
  bone = smax(bone, -ellipsoid(chin - vec3(0.0, 0.1, -0.06), vec3(0.36, 0.16, 0.44)), 0.03);
  bone = smin(bone, capsule(q, vec3(0.56, -0.3, -0.1), vec3(0.42, -0.74 - jaw, 0.04), 0.055), 0.06);
  d = min(d, bone);
  return min(d, teeth(q, -0.84 - jaw * 1.0));
}

vec3 normalAt(vec3 q) {
  vec2 e = vec2(0.0015, -0.0015);
  return normalize(
    e.xyy * map(q + e.xyy) + e.yyx * map(q + e.yyx) + e.yxy * map(q + e.yxy) + e.xxx * map(q + e.xxx)
  );
}

// El cromo no tiene color propio: es lo que refleja. Un estudio negro con
// barras de luz blanca y una línea de color en el horizonte.
vec3 studio(vec3 r) {
  float around = atan(r.x, r.z);
  float bars = smoothstep(0.0, 0.05, sin(around * 5.0 + drift * 0.35) - 0.82) * smoothstep(-0.25, 0.55, r.y);
  float top = exp(-abs(r.y - 0.82) * 13.0) * 1.6;
  float horizon = exp(-abs(r.y + 0.14) * 11.0);
  vec3 color = vec3(0.012) + vec3(0.92, 0.96, 1.0) * (bars * (0.85 + 1.4 * flash) + top);
  return color + accent * horizon * (0.5 + 1.2 * level + 1.5 * flash);
}

// Líneas talladas en el cráneo que se encienden con la música: lo que lo vuelve máquina.
float seams(vec3 q) {
  vec3 m = vec3(abs(q.x), q.yz);
  float crown = smoothstep(0.32, 0.4, q.y);
  float center = smoothstep(0.012, 0.003, m.x) * crown;
  float meridian = abs(mod(atan(m.x, q.z) + 0.2, 0.42) - 0.21);
  float lines = smoothstep(0.008, 0.002, meridian) * crown * smoothstep(1.2, 0.5, q.y);
  float ring = smoothstep(0.012, 0.003, abs(q.y - 0.42));
  float pulse = 0.5 + 0.5 * sin(q.y * 16.0 + q.z * 8.0 - drift * 7.0);
  return (center + lines * pulse + ring) * step(-0.2, q.z + 0.7);
}

// Alas detrás de la figura, dibujadas como luz: plumas en el ángel, costillas en el demonio.
vec3 wings(vec2 p) {
  vec2 from = vec2(abs(p.x), p.y) - vec2(0.12, -0.28);
  float reach = length(from);
  float angle = atan(from.y, from.x);
  float beat = sin(drift * 0.9) * 0.07 + 0.1 * level;
  float open = smoothstep(-0.5 - beat, -0.3 - beat, angle) * smoothstep(1.35 + beat, 1.0 + beat, angle);
  float cells = figure > 1.5 ? 15.0 : 6.0;
  float rib = abs(fract((angle + beat) * cells / 1.8) - 0.5);
  float tip = 0.82 + 0.22 * sin(angle * 3.0 + 0.6);
  float inside = open * smoothstep(tip, tip - 0.03, reach) * smoothstep(0.1, 0.25, reach);
  if (figure > 1.5) {
    float feather = smoothstep(0.5, 0.15, rib) * (0.2 + 0.5 * smoothstep(0.08, 0.0, 0.5 - rib));
    float rows = 0.6 + 0.4 * sin(reach * 26.0);
    return accent * inside * feather * rows * (0.45 + 0.8 * level + 1.3 * flash);
  }
  float bone = 0.012 / (rib * 0.25 + 0.012);
  return accent * inside * (0.06 + 0.1 * bone) * (0.5 + 0.9 * level + 1.5 * flash);
}

// Vigas de luz por detrás, marcos que vienen hacia la cámara y una bruma al pie.
vec3 backdrop(vec2 p) {
  vec2 from = p - vec2(0.0, 0.1);
  float angle = atan(from.x, from.y);
  float beams = pow(0.5 + 0.5 * sin(angle * 7.0 + drift * 0.3), 7.0);
  beams += 0.6 * pow(0.5 + 0.5 * sin(angle * 17.0 - drift * 0.21), 12.0);
  float reach = length(from);
  vec3 color = mix(vec3(0.7, 0.75, 0.85), accent, 0.55) * beams * exp(-1.5 * reach) * (0.16 + 0.5 * level + 0.7 * flash);

  for (float i = 0.0; i < FRAMES; i += 1.0) {
    float age = fract(drift * 0.11 + i / FRAMES);
    float size = mix(0.03, 1.5, age * age);
    float edge = abs(max(abs(p.x) / 1.6, abs(p.y)) - size);
    float presence = smoothstep(0.0, 0.2, age) * smoothstep(1.0, 0.8, age);
    color += accent * 0.0035 / (edge + 0.0035) * presence * (0.35 + 0.8 * level + 1.5 * flash);
  }

  if (figure > 0.5 && figure < 2.5) color += wings(p);
  return color + accent * exp(-5.0 * (p.y + 0.72)) * 0.05 * (0.8 + level);
}

// Brasas que suben por delante de todo.
vec3 embers(vec2 p) {
  vec3 color = vec3(0.0);
  for (float layer = 1.0; layer < 4.0; layer += 1.0) {
    vec2 grid = p * (3.0 + layer * 3.0);
    grid.y -= drift * (0.5 + 0.2 * layer) + layer * 7.0;
    grid.x += sin(grid.y * 0.8 + layer) * 0.2;
    vec2 cell = floor(grid);
    float chance = hash2(cell + layer);
    if (chance > 0.75) {
      vec2 at = 0.2 + 0.6 * vec2(hash2(cell + 3.1), hash2(cell + 7.7));
      float blink = 0.5 + 0.5 * sin(drift * 3.0 + chance * 40.0);
      color += accent * smoothstep(0.05, 0.0, length(fract(grid) - at)) * blink * (0.5 + level);
    }
  }
  return color;
}

// Distancia entre el rayo de la cámara y un láser; -1 si el láser va para el otro lado.
float laser(vec3 ro, vec3 rd, vec3 from, vec3 dir) {
  vec3 n = cross(rd, dir);
  float along = dot(cross(rd, n), from - ro) / dot(n, n);
  if (along < 0.0) return 0.0;
  float gap = abs(dot(from - ro, n)) / length(n);
  return 0.0022 / (gap + 0.0025) * exp(-0.12 * along);
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.x, resolution.y);
  if (glitch > 0.01) {
    float slice = hash(floor(p.y * 16.0) + seed);
    if (slice < 0.35) p.x += (slice - 0.17) * 0.5 * glitch;
  }
  float radius = length(p);
  vec2 lens = p * (1.0 - 0.1 * kick);

  vec3 forward = normalize(vec3(0.0, aim, 0.0) - eye);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  vec3 rd = normalize(lens.x * right + lens.y * up + focal * forward);

  // La calavera ocupa una parte de la imagen: el resto no se calcula.
  float toCenter = -dot(eye, rd);
  float missBy = length(eye + rd * toCenter);
  float t = max(toCenter - BOUND, 0.0);
  bool hit = false;
  float steps = 0.0;
  if (missBy < BOUND) {
    for (float i = 0.0; i < MARCH_STEPS; i += 1.0) {
      float d = map(eye + rd * t);
      if (d < 0.0016 * t) {
        hit = true;
        break;
      }
      t += d * 0.9;
      if (t > MARCH_FAR) break;
      steps += 1.0;
    }
  }

  vec3 color;
  if (hit) {
    vec3 q = eye + rd * t;
    vec3 n = normalAt(q);
    float facing = max(dot(n, -rd), 0.0);
    float occlusion = clamp(map(q + n * 0.14) / 0.14, 0.0, 1.0);
    float fresnel = 0.55 + 0.45 * pow(1.0 - facing, 4.0);
    color = studio(reflect(rd, n)) * fresnel * (0.2 + 0.8 * occlusion);
    if (figure < 3.5) color += accent * seams(q) * (0.35 + 1.2 * level + 2.5 * flash);
    if (figure > 2.5 && figure < 3.5) {
      // Androide: la cara también tiene paneles, y el cromo se vuelve más frío.
      vec2 plate = abs(fract(vec2(q.x * 3.5, q.y * 5.0 + 0.2 * q.z)) - 0.5);
      float joint = smoothstep(0.035, 0.008, 0.5 - max(plate.x, plate.y));
      color = color * (1.0 - 0.75 * joint) + accent * joint * (0.25 + 0.9 * level + 2.0 * flash);
    }
    if (figure > 1.5 && figure < 2.5 && q.y > 1.2) color += accent * (1.6 + 2.0 * flash);
  } else {
    color = backdrop(p);
  }

  // Los ojos: se abre el brillo con la música.
  for (float side = -1.0; side < 2.0; side += 2.0) {
    vec3 socket = (figure > 3.5 ? vec3(0.34, 0.02, 0.76) : EYE_SOCKET) * vec3(side, 1.0, 1.0);
    vec3 toEye = socket - eye;
    float along = dot(toEye, rd);
    float gap = length(toEye - rd * along);
    float glow = 0.014 / (gap * gap + 0.005);
    color += mix(accent, vec3(1.0), 0.25 * flash) * glow * (0.22 + 0.7 * level + 1.3 * flash);

    float power = smoothstep(0.35, 0.9, level);
    if (power > 0.0) {
      vec3 sweep = vec3(side * (0.25 + 0.5 * sin(drift * 0.6)), 0.35 * cos(drift * 0.8), 1.0);
      vec3 cross1 = normalize(sweep);
      vec3 cross2 = normalize(sweep + vec3(side * 0.7, -0.35, 0.0));
      color += accent * power * (laser(eye, rd, socket, cross1) + laser(eye, rd, socket, cross2));
    }
  }

  color += embers(p);
  color *= 1.0 + 0.5 * flash;
  color *= 1.0 - 0.55 * smoothstep(0.5, 1.15, radius);
  color *= 0.97 + 0.03 * sin(gl_FragCoord.y * 1.6);

  color = color / (1.0 + 0.4 * color);
  color = pow(color, vec3(0.9));

  // Los controles del panel, sobre la imagen ya terminada.
  color = (color - 0.5) * contrast + 0.5;
  color = mix(vec3(dot(color, vec3(0.299, 0.587, 0.114))), color, saturation);
  gl_FragColor = vec4(clamp(color * brightness, 0.0, 1.0), 1.0);
}
