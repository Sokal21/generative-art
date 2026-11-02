#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D tex0;
uniform vec2 resolution;
uniform float brightness;
uniform float contrast;
uniform float saturation;

// La imagen tal cual. Los sliders siguen andando; en sus valores iniciales no la tocan.
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv.y = 1.0 - uv.y;

  vec3 color = texture2D(tex0, uv).rgb;
  color = (color - 0.5) * contrast + 0.5;
  color = mix(vec3(dot(color, vec3(0.299, 0.587, 0.114))), color, saturation);
  color *= brightness;

  gl_FragColor = vec4(color, 1.0);
}
