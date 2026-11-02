// El mismo fractal sin espejos: una cueva continua en lugar de un caleidoscopio.
vec3 render(vec2 p, float radius) {
  return kalisetLayers(atan(p.y, p.x) + twist, radius);
}
