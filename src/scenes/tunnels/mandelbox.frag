float map(vec3 q) {
  // Se repite para que se pueda avanzar para siempre, espejado para que no se note la unión.
  q = abs(mod(q + 3.0, 12.0) - 6.0) - 3.0;
  float scale = -1.9 - 0.5 * morph + 0.15 * opening;
  vec3 z = q;
  float dr = 1.0;
  for (float i = 0.0; i < 7.0; i += 1.0) {
    z = clamp(z, -1.0, 1.0) * 2.0 - z;
    float r2 = dot(z, z);
    float k = r2 < 0.25 ? 4.0 : r2 < 1.0 ? 1.0 / r2 : 1.0;
    z *= k;
    dr = dr * k * abs(scale) + 1.0;
    z = z * scale + q;
  }
  return length(z) / abs(dr);
}

vec3 render(vec2 p, float radius) {
  return flyThrough(p, vec3(3.0, 3.0, travel * 1.5));
}
