const float SECTORS = 6.0;

vec3 render(vec2 p, float radius) {
  // Plegar el ángulo arma el caleidoscopio y evita el salto de atan.
  float sector = TAU / SECTORS;
  return kalisetLayers(abs(mod(atan(p.y, p.x) + twist, sector) - 0.5 * sector), radius);
}
