#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D tex0;
uniform vec2 resolution;
uniform float time;
uniform float speed;

// Game of Life rules
void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 pixelSize = 1.0 / resolution.xy;
    
    // Count live neighbors
    int liveNeighbors = 0;
    
    // Check all 8 neighbors
    for(int i = -1; i <= 1; i++) {
        for(int j = -1; j <= 1; j++) {
            if(i == 0 && j == 0) continue; // Skip current cell
            
            vec2 neighborUV = uv + vec2(float(i), float(j)) * pixelSize;
            vec4 neighbor = texture2D(tex0, neighborUV);
            
            // Consider a cell alive if its red channel is above 0.5
            if(neighbor.r > 0.5) {
                liveNeighbors++;
            }
        }
    }
    
    // Get current cell state
    vec4 current = texture2D(tex0, uv);
    float isAlive = step(0.5, current.r);
    
    // Apply Game of Life rules
    float newState = 0.0;
    
    if(isAlive > 0.5) {
        // Cell is alive
        if(liveNeighbors == 2 || liveNeighbors == 3) {
            newState = 1.0; // Survives
        }
    } else {
        // Cell is dead
        if(liveNeighbors == 3) {
            newState = 1.0; // Becomes alive
        }
    }
    
    // Output the new state
    gl_FragColor = vec4(newState, newState, newState, 1.0);
}
