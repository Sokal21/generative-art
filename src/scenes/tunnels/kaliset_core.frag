const float LAYERS = 5.0;
const float ITERATIONS = 10.0;

// Fractal Kaliset: se pliega y se invierte el punto una y otra vez, y se mide
// cuánto salta. Cuanto más cerca de la órbita estable, más brilla.
float kaliset(vec3 q, vec3 fold) {
  float glow = 0.0;
  float previous = 0.0;
  for (float i = 0.0; i < ITERATIONS; i += 1.0) {
    q = abs(q) / dot(q, q) - fold;
    float size = length(q);
    glow += exp(-2.5 * abs(size - previous));
    previous = size;
  }
  return glow / ITERATIONS;
}

vec3 kalisetLayers(float angle, float radius) {
  vec3 fold = vec3(0.72, 0.58, 0.82) + vec3(0.2, 0.26, 0.1) * opening + vec3(-0.2, 0.18, -0.14) * morph;
  vec3 color = vec3(0.0);

  // Capas a distinta profundidad: las de atrás se mueven distinto y dan volumen.
  for (float layer = 0.0; layer < LAYERS; layer += 1.0) {
    float depth = (0.32 / (radius + 0.06)) * (1.0 + layer * 0.22);
    float z = depth + travel * (1.0 + layer * 0.08) + layer * 0.37;
    // Repetir z deja avanzar para siempre sin que el fractal se vaya al infinito.
    z = abs(mod(z, 4.0) - 2.0);
    vec3 q = vec3(cos(angle), sin(angle), z) * (0.75 + 0.1 * layer);

    float glow = kaliset(q, fold);
    vec3 tint = palette(hue + glow * 0.9 + layer * 0.09 + depth * 0.04);
    color += tint * pow(glow, 2.2) * 3.2 / (1.0 + layer * 0.45);
  }

  // Al centro el detalle se vuelve ruido: se funde en la luz del fondo del túnel.
  return color * smoothstep(0.0, 0.16, radius);
}
