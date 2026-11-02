const float JULIA_STEPS = 28.0;

vec3 render(vec2 p, float radius) {
  // Coordenadas en espiral: avanzar es correrse en el logaritmo del radio.
  float along = log(radius + 0.02) * 1.3 + travel * 1.6;
  float angle = atan(p.y, p.x) + twist + along * 0.5;
  vec2 z = (0.75 + 0.35 * sin(along * 2.0)) * vec2(cos(angle * 3.0), sin(angle * 3.0));
  vec2 c = vec2(-0.745 + 0.16 * morph, 0.13 + 0.12 * opening);

  float trap = 10.0;
  float escaped = JULIA_STEPS;
  for (float i = 0.0; i < JULIA_STEPS; i += 1.0) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    float size = dot(z, z);
    if (size > 16.0) {
      escaped = i;
      break;
    }
    trap = min(trap, abs(z.x * z.y));
  }

  float filament = 0.03 / (trap + 0.02);
  vec3 tint = palette(hue + escaped * 0.02 + along * 0.05);
  return tint * (filament + escaped / JULIA_STEPS * 0.5) * smoothstep(0.0, 0.1, radius);
}
