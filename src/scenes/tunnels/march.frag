const float MARCH_STEPS = 64.0;
const float MARCH_FAR = 14.0;

float map(vec3 q);

// Vuela por `map` en línea recta. Pasos gastados y distancia dan la luz, sin
// calcular normales: las esquinas y los huecos quedan oscuros solos.
vec3 flyThrough(vec2 p, vec3 origin) {
  vec3 ray = normalize(vec3(p * rotation(twist), 1.0));
  float t = 0.02;
  float steps = 0.0;
  for (float i = 0.0; i < MARCH_STEPS; i += 1.0) {
    float d = map(origin + ray * t);
    if (d < 0.0008 * t || t > MARCH_FAR) break;
    t += d;
    steps += 1.0;
  }
  float cavity = 1.0 - steps / MARCH_STEPS;
  float fog = exp(-0.28 * t);
  vec3 tint = palette(hue + t * 0.09 + (origin + ray * t).z * 0.05);
  return tint * cavity * cavity * fog * 2.2;
}
