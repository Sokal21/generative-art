// effect.vert

attribute vec3 position;
attribute vec2 texcoord;

varying vec2 vTexCoord;

void main() {
  vTexCoord = texcoord;
  gl_Position = vec4(position, 1.0);
}