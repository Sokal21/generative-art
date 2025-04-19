#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vTexCoord;
uniform sampler2D tex0;

uniform vec2 offset;

void main() {

  vec2 uv = vTexCoord;
  uv.y = 1.0 - uv.y;

  
  vec4 red = texture2D(tex0, uv + offset);
  vec4 green = texture2D(tex0, uv);
  vec4 blue = texture2D(tex0, uv - offset);
  
  vec4 color = vec4(red.r, green.g, blue.b, 1.0);
  
  // Apply red filter with stronger red tint
  vec4 redFilter = vec4(0.6, 0.4, 0.4, 1.0); // Stronger red tint
  color *= redFilter;
  
  // Increase contrast
  float contrast = 1.2; // Adjust this value to control contrast (1.0 is normal)
  color.rgb = (color.rgb - 0.5) * contrast + 0.5;
  
  // Send the color to the screen
  gl_FragColor = color;

}