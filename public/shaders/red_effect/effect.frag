#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D tex0;
uniform vec2 resolution;
uniform float brightness;  // Brightness control (0.0 to 2.0)
uniform float contrast;    // Contrast control (0.0 to 2.0)
uniform float saturation; // Saturation control (0.0 to 2.0)
uniform float time;       // Time for animation
uniform float speed;      // Speed from microphone input
uniform float distortion; // Distortion intensity (0.0 to 1.0)
varying vec2 vTexCoord;

// Function to adjust saturation
vec3 adjustSaturation(vec3 color, float saturation) {
    // Convert to grayscale
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    // Interpolate between grayscale and color
    return mix(vec3(gray), color, saturation);
}

// Function to create swirling distortion
vec2 swirl(vec2 uv, vec2 center, float strength, float radius) {
    vec2 delta = uv - center;
    float dist = length(delta);
    // Use speed to control rotation speed and distortion for intensity
    float angle = strength * exp(-dist / radius) + time * 0.5;
    float s = sin(angle);
    float c = cos(angle);
    // Apply distortion based on distance from center
    float distortionFactor = (distortion + 1.0) * (exp(-dist / (radius * 0.5)));
    return center + vec2(
        (delta.x * c - delta.y * s) * distortionFactor,
        (delta.x * s + delta.y * c) * distortionFactor
    );
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // Create swirling distortion
    vec2 center = vec2(0.5, 0.5);
    float strength = 2.0;  // Strength of the swirl
    float radius = 0.3;    // Radius of the effect
    // vec2 distortedUV = swirl(uv, center, strength, radius);
    vec2 distortedUV = uv;
    
    // Sample the texture with distortion
    vec4 color = texture2D(tex0, distortedUV);
    
    // Apply red multiply effect
    vec3 redTint = vec3(1.2, 0.0, 0.0);  // Slightly boosted red
    
    // Apply contrast
    color.rgb = (color.rgb - 0.5) * contrast + 0.5;
    
    // Apply red tint
    color.rgb = color.rgb * redTint;
    
    // Apply saturation
    color.rgb = adjustSaturation(color.rgb, saturation);
    
    // Apply brightness
    color.rgb = color.rgb * brightness;
    
    // Clamp values to valid range
    color.rgb = clamp(color.rgb, 0.0, 1.0);
    
    gl_FragColor = color;
}