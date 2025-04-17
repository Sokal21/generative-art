#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;

void main() {
	vec2 st = gl_FragCoord.xy/resolution;

	gl_FragColor = vec4(st.x * abs(sin(time)),st.y * abs(sin(time)),0.0,1.0);
}
