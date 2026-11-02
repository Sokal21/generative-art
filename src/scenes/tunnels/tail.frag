void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.x, resolution.y);
  p *= 1.0 - 0.18 * kick;

  float radius = length(p);
  vec3 color = render(p, radius);

  // La luz del fondo del túnel.
  vec3 light = palette(hue + 0.5);
  color += light * 0.09 / (radius * radius * 12.0 + 0.1);

  color *= 0.75 + 1.1 * flash;
  color += light * 0.14 * flash;
  color *= 1.0 - 0.45 * smoothstep(0.45, 1.05, radius);

  // Comprime las luces altas: satura el color sin quemar todo a blanco.
  color = color / (1.0 + 0.45 * color);
  color = pow(color, vec3(0.85));

  // Los controles del panel, sobre la imagen ya terminada.
  color = (color - 0.5) * contrast + 0.5;
  color = mix(vec3(dot(color, vec3(0.299, 0.587, 0.114))), color, saturation);
  gl_FragColor = vec4(clamp(color * brightness, 0.0, 1.0) * fade, fade);
}
