import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Las almas que invoca el Wekufe en 1810-3D: una cara que gime, de una unidad de alto.
const MODEL_URL = "/models/alma.glb";
const COUNT = 18;
// Las que quedan dando vueltas cuando no invoca: apenas se ven.
const RESTING = 0.12;
// Cuánto dura una invocación hasta apagarse.
const CALL_S = 6;
// Cuánto más miran a la cámara que hacia donde van.
const LOOKS = 1.6;

interface Soul {
  angle: number;
  wind: number;
  reach: number;
  height: number;
  size: number;
  phase: number;
  flicker: number;
}

// El dibujo de la cara, más rojo y encendido: los huecos de los ojos y la boca
// quedan oscuros, y con la mezcla aditiva se ven a través. Más claro en los bordes.
const vertexShader = `
  attribute float presence;
  uniform float time;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vPresence;

  void main() {
    vUv = uv;
    vPresence = presence;
    vec3 moved = position + normal * 0.01 * sin(time * 4.0 + position.y * 9.0);
    mat4 placed = modelViewMatrix * instanceMatrix;
    vec4 view = placed * vec4(moved, 1.0);
    vNormal = mat3(placed) * normal;
    vView = -view.xyz;
    gl_Position = projectionMatrix * view;
  }
`;

const fragmentShader = `
  uniform sampler2D map;
  uniform vec3 tint;
  uniform float flash;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vPresence;

  void main() {
    vec3 drawn = texture2D(map, vUv).rgb;
    float light = dot(drawn, vec3(0.3, 0.6, 0.1));
    vec3 color = tint * pow(light, 1.2) * 9.0;
    float edge = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
    float clear = (0.7 + 0.6 * edge * edge) * vPresence;
    gl_FragColor = vec4((color + flash * 0.6) * clear, 1.0);
  }
`;

/**
 * Caras espectrales que dan vueltas alrededor del Wekufe. Casi invisibles
 * mientras descansa; cuando invoca salen todas en espiral, brillando y mirando
 * a la cámara, y se apagan de a poco.
 */
export class Souls {
  readonly group = new THREE.Group();
  private faces: THREE.InstancedMesh | null = null;
  private presence = new Float32Array(COUNT);
  private souls: Soul[] = [];
  private calling = 0;
  private time = 0;

  private matrix = new THREE.Matrix4();
  private at = new THREE.Vector3();
  private ahead = new THREE.Vector3();
  private toCamera = new THREE.Vector3();
  private scale = new THREE.Vector3();
  private origin = new THREE.Vector3();

  constructor() {
    for (let i = 0; i < COUNT; i++) {
      this.souls.push({
        angle: (i / COUNT) * Math.PI * 2,
        wind: (0.5 + Math.random() * 0.7) * (Math.random() < 0.5 ? -1 : 1),
        reach: 0.8 + Math.random() * 0.9,
        height: 0.2 + Math.random() * 2.1,
        size: 0.22 + Math.random() * 0.16,
        phase: Math.random() * Math.PI * 2,
        flicker: 4 + Math.random() * 6,
      });
    }
    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => this.build(gltf.scene),
      undefined,
      (error) => console.error("[wekufe] no se pudo cargar el alma", error)
    );
  }

  /** Las llama: salen todas, con `strength` de 0 a 1. */
  summon(strength = 1) {
    this.calling = Math.max(this.calling, strength);
  }

  update(dt: number, level: number, flash: number, camera: THREE.Camera, center: THREE.Vector3) {
    this.time += dt;
    this.calling = Math.max(0, this.calling - dt / CALL_S);
    const faces = this.faces;
    if (!faces) return;
    const material = faces.material as THREE.ShaderMaterial;
    material.uniforms.time.value = this.time;
    material.uniforms.flash.value = flash;

    // Invocadas se abren en espiral y giran más rápido.
    const call = this.calling * this.calling * (3 - 2 * this.calling);
    this.souls.forEach((soul, i) => {
      soul.angle += soul.wind * dt * (1 + 2.2 * call);
      const reach = soul.reach * (1 + 0.7 * call);
      const bob = Math.sin(this.time * 1.3 + soul.phase) * 0.15;
      this.place(soul, soul.angle, reach, bob, center, this.at);
      this.place(soul, soul.angle + 0.08 * Math.sign(soul.wind), reach, bob, center, this.ahead);

      // La boca entre hacia donde va y la cámara: si no, al pasar se le ve la nuca.
      this.ahead.sub(this.at).normalize();
      this.toCamera.subVectors(camera.position, this.at).normalize().multiplyScalar(LOOKS).add(this.ahead);
      this.matrix.lookAt(this.toCamera, this.origin, THREE.Object3D.DEFAULT_UP);
      this.matrix.scale(this.scale.setScalar(soul.size * (0.7 + 0.5 * call)));
      this.matrix.setPosition(this.at);
      faces.setMatrixAt(i, this.matrix);

      const flicker = 0.75 + 0.25 * Math.sin(this.time * soul.flicker + soul.phase);
      this.presence[i] = (RESTING + 0.2 * level + 0.95 * call) * flicker;
    });
    faces.instanceMatrix.needsUpdate = true;
    (faces.geometry.getAttribute("presence") as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  private place(soul: Soul, angle: number, reach: number, bob: number, center: THREE.Vector3, out: THREE.Vector3) {
    out.set(center.x + Math.cos(angle) * reach, soul.height + bob, center.z + Math.sin(angle) * reach * 0.85);
  }

  private build(scene: THREE.Object3D) {
    let found: THREE.Mesh | null = null;
    scene.updateMatrixWorld(true);
    scene.traverse((node) => {
      if (!found && (node as THREE.Mesh).isMesh) found = node as THREE.Mesh;
    });
    if (!found) return;
    const mesh = found as THREE.Mesh;
    // El centro de la cara en el lugar del alma: el modelo está parado sobre su base.
    const shape = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).translate(0, -0.5, 0);
    shape.setAttribute("presence", new THREE.InstancedBufferAttribute(this.presence, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: (mesh.material as THREE.MeshStandardMaterial).map },
        tint: { value: new THREE.Color(1.6, 0.42, 0.3) },
        time: { value: 0 },
        flash: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.faces = new THREE.InstancedMesh(shape, material, COUNT);
    this.faces.frustumCulled = false;
    this.group.add(this.faces);
  }
}
