const float NEON_LAYERS = 6.0;

vec3 render(vec2 p, float radius) {
  vec3 color = vec3(0.0);
  for (float layer = 0.0; layer < NEON_LAYERS; layer += 1.0) {
    // Cada capa viene de lejos, pasa y se apaga antes de reaparecer al fondo.
    float age = fract(travel * 0.45 + layer / NEON_LAYERS);
    vec2 q = p * rotation(twist + layer * 0.6) * mix(9.0, 0.6, age);
    for (float i = 0.0; i < 4.0; i += 1.0) {
      q = abs(q) - 0.55 - 0.2 * opening;
      q *= rotation(0.6 + 0.5 * morph);
    }
    float line = min(abs(q.x), abs(q.y));
    float presence = smoothstep(0.0, 0.25, age) * smoothstep(1.0, 0.75, age);
    color += palette(hue + layer / NEON_LAYERS) * 0.012 / (line + 0.006) * presence * (1.0 + 2.0 * flash);
  }
  return color;
}
