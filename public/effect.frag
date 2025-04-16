#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D tex0;
uniform vec2 resolution;
uniform float time;
uniform float speed;  // New speed uniform

// Random function for glitch effect
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  // Calculate normalized texture coordinates and flip vertically
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv.y = 1.0 - uv.y;  // Flip the Y coordinate
  
  // 🌊 Wave distortion
  float wave = sin(uv.y * 20.0 + time * 2.0 * speed) * 0.01;
  uv.x += wave;
  
  // 🎲 Random glitch offset
  float glitch = random(vec2(time * 0.1 * speed, uv.y)) * 0.02;
  if (random(vec2(time * 0.1 * speed)) > 0.95) {
    uv.x += glitch;
  }
  
  vec4 color = texture2D(tex0, uv);

  // 🔴 Strong red hue shift
  float angle = 0.0; // Fixed angle for red hue
  float s = sin(angle), c = cos(angle);
  mat3 hueRotate = mat3(
    vec3(1.0, 0.0, 0.0),  // Red channel
    vec3(0.0, 0.0, 0.0),  // Green channel
    vec3(0.0, 0.0, 0.0)   // Blue channel
  );
  color.rgb = hueRotate * color.rgb;

  // 💥 High contrast
  float contrast = 2.5;  // Increased contrast
  color.rgb = (color.rgb - 0.5) * contrast + 0.5;

  // Boost red channel
  color.r *= 1.5;
  
  // Random color shift for glitch effect
  if (random(vec2(time * 0.1 * speed)) > 0.98) {
    color.rgb = vec3(1.0, 0.0, 0.0);
  }

  gl_FragColor = color;
}
