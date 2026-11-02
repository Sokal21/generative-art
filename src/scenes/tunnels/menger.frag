float map(vec3 q) {
  float d = -1.0;
  float scale = 1.0;
  for (float i = 0.0; i < 4.0; i += 1.0) {
    q.xy *= rotation(morph * 0.35 * i);
    vec3 cell = mod(q * scale, 2.0) - 1.0;
    scale *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(cell));
    float cross = min(max(r.x, r.y), min(max(r.y, r.z), max(r.z, r.x)));
    d = max(d, (cross - 1.0 + 0.25 * opening) / scale);
  }
  return d;
}

vec3 render(vec2 p, float radius) {
  return flyThrough(p, vec3(0.0, 0.0, travel * 2.0));
}
