import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

// Lado del cubo de ruido. Se repite, así que alcanza con uno chico.
const NOISE_SIZE = 32;
const STEPS = 9;
// Cuánto tapa en total: más bajo, más se ve el demonio a través.
const THICK = 0.6;

/**
 * Niebla volumétrica: por cada píxel recorre el rayo de la cámara a través de
 * un volumen de ruido que se arremolina, más denso abajo, y lo ilumina con la
 * luz roja de abajo. No conoce la profundidad de la imagen, así que la niebla
 * queda por delante de todo, como si el demonio estuviera adentro.
 */
export class Fog {
  readonly pass: ShaderPass;
  private inverse = new THREE.Matrix4();

  constructor(light: THREE.Vector3) {
    this.pass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        noise: { value: makeNoise() },
        viewer: { value: new THREE.Vector3() },
        unproject: { value: new THREE.Matrix4() },
        light: { value: light.clone() },
        warmth: { value: 1 },
        flash: { value: 0 },
        time: { value: 0 },
        density: { value: 1 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler3D noise;
        uniform vec3 viewer;
        uniform mat4 unproject;
        uniform vec3 light;
        uniform float warmth;
        uniform float flash;
        uniform float time;
        uniform float density;
        varying vec2 vUv;

        const float STEPS = ${STEPS.toFixed(1)};
        const float FAR = 7.5;

        float thickness(vec3 p) {
          vec3 wind = vec3(time * 0.05, time * 0.03, -time * 0.04);
          float n = texture(noise, p * 0.16 + wind).r * 0.65 + texture(noise, p * 0.42 - wind * 1.7).r * 0.35;
          // Más espesa abajo, donde termina el cuerpo, y nada lejos del demonio.
          float low = exp(-max(p.y + 0.2, 0.0) * 0.9);
          float near = smoothstep(6.0, 3.0, length(p.xz));
          return smoothstep(0.45, 0.85, n) * low * near * density;
        }

        void main() {
          vec4 far = unproject * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
          vec3 ray = normalize(far.xyz / far.w - viewer);

          // Arranque corrido al azar por píxel: con pocos pasos, evita las franjas.
          float step = FAR / STEPS;
          float t = step * fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          float clear = 1.0;
          vec3 glow = vec3(0.0);
          for (float i = 0.0; i < STEPS; i += 1.0) {
            vec3 p = viewer + ray * t;
            float d = thickness(p);
            if (d > 0.001) {
              vec3 toLight = light - p;
              vec3 lit = vec3(0.06, 0.055, 0.07) + vec3(0.8, 0.1, 0.04) * warmth / (1.0 + dot(toLight, toLight) * 2.0);
              lit += vec3(0.3) * flash;
              float taken = 1.0 - exp(-d * step * 0.9);
              glow += clear * taken * lit;
              clear *= 1.0 - taken;
            }
            t += step;
          }

          vec3 color = texture2D(tDiffuse, vUv).rgb;
          gl_FragColor = vec4(color * clear + glow, 1.0);
        }
      `,
    });
  }

  update(camera: THREE.Camera, time: number, warmth: number, flash: number, density: number) {
    const uniforms = this.pass.uniforms;
    camera.updateMatrixWorld();
    uniforms.viewer.value.copy(camera.position);
    uniforms.unproject.value.copy(this.inverse.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse));
    uniforms.time.value = time;
    uniforms.warmth.value = warmth;
    uniforms.flash.value = flash;
    uniforms.density.value = density * THICK;
  }

  dispose() {
    (this.pass.uniforms.noise.value as THREE.Texture).dispose();
    this.pass.dispose();
  }
}

// Ruido que se repite en las tres direcciones, suavizado una vez para que el
// filtrado lineal lo deje redondo y no granulado.
function makeNoise(): THREE.Data3DTexture {
  const size = NOISE_SIZE;
  const raw = new Float32Array(size * size * size).map(() => Math.random());
  const at = (x: number, y: number, z: number) =>
    raw[((z + size) % size) * size * size + ((y + size) % size) * size + ((x + size) % size)];
  const data = new Uint8Array(size * size * size);
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        for (let dz = -1; dz <= 1; dz++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) sum += at(x + dx, y + dy, z + dz);
          }
        }
        // El promedio de 27 se junta cerca de 0.5: se vuelve a abrir.
        const spread = Math.min(1, Math.max(0, (sum / 27 - 0.5) * 3 + 0.5));
        data[z * size * size + y * size + x] = Math.round(spread * 255);
      }
    }
  }
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RedFormat;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
