float map(vec3 q) {
  float size = 1.12 + 0.18 * morph + 0.06 * opening;
  float scale = 1.0;
  for (float i = 0.0; i < 6.0; i += 1.0) {
    q = -1.0 + 2.0 * fract(0.5 * q + 0.5);
    float k = size / dot(q, q);
    q *= k;
    scale *= k;
  }
  return 0.25 * abs(q.y) / scale;
}

vec3 render(vec2 p, float radius) {
  return flyThrough(p, vec3(0.42, 0.61, travel * 1.2));
}
