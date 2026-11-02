import p5 from "p5";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Scene } from ".";
import { EffectParams, WEKUFE_SHOT_IDS, WekufeMove, WekufeShot } from "../../shared/protocol";
import { Microphone } from "../inputs/microphone";
import { Pulse } from "../inputs/pulse";
import { Claws } from "./wekufe_claws";
import { Fog } from "./wekufe_fog";
import { Souls } from "./wekufe_souls";

// El demonio de la peste de 1810-3D, con sus animaciones. Corta por debajo de la cintura.
const MODEL_URL = "/models/wekufe.glb";
// Se lo escala a esta altura, de la cintura a la punta de los cuernos.
const HEIGHT = 2;

const CUT_EVERY_BEATS = 8;
const CUT_EVERY_S = 9;
const GLITCH_EVERY_BEATS = 4;

// Lo que hace en cada corte. Las acciones se hacen una vez y vuelve a flotar.
const IDLE = "reposo";
// La muerte es un grito de dolor retorciéndose: va siempre con la cara de cerca.
const SCREAM = "muerte";
const ACTIONS = ["zarpazo", "lanzar", "invocar", SCREAM];
// Primer plano de la cara para el grito.
const SCREAM_SHOT = WEKUFE_SHOT_IDS.indexOf("face");
const FACING_CLIPS = ["lanzar", "invocar"];
const AIM_SAMPLES = 48;
// En el grito la cámara sigue la cabeza, que baja casi hasta la cintura al retorcerse.
const SCREAM_LOOK = new THREE.Vector3(0, 0.15, 0);
const SCREAM_FROM = new THREE.Vector3(0, 0.05, 1.45);

interface Shot {
  from: [number, number, number];
  at: [number, number, number];
  fov: number;
}

// Planos de película de terror, en el orden en que los muestra el panel.
const SHOT_PLACES: Record<WekufeShot, Shot> = {
  low: { from: [0, 0.4, 4.4], at: [0, 1.05, 0], fov: 40 },
  face: { from: [0, 1.55, 1.75], at: [0, 1.72, 0], fov: 34 },
  eyes: { from: [0.06, 1.84, 1.3], at: [0.06, 1.8, 0], fov: 30 },
  side: { from: [1.6, 0.6, 2], at: [0, 1.35, 0], fov: 38 },
  above: { from: [0.7, 3.2, 1.8], at: [0, 1.3, 0], fov: 38 },
  behind: { from: [-1.3, 1.9, -1.7], at: [0, 1.5, 1.2], fov: 40 },
};
const SHOTS = WEKUFE_SHOT_IDS.map((id) => SHOT_PLACES[id]);
// En automático el zarpazo siempre va de frente y cerca: las garras vienen a la cámara.
const SCARE_SHOT = WEKUFE_SHOT_IDS.indexOf("face");
// Cuánto se acerca la cámara a lo que mira durante un plano.
const DOLLY_PER_S = 0.035;
const DOLLY_MAX = 0.3;

// Aire caliente sobre la imagen: ondula los bordes, ensucia con grano y oscurece
// las esquinas. Es lo que disimula que el modelo tiene pocas caras.
const HEAT_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    amount: { value: 0 },
    split: { value: 0 },
    angle: { value: 0 },
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
    uniform float time;
    uniform float amount;
    uniform float split;  // Cuánto se separan los colores.
    uniform float angle;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
    }

    void main() {
      // Dos capas de ruido que suben, como el aire sobre una llama.
      vec2 flow = vUv * vec2(7.0, 5.0) - vec2(0.0, time * 0.6);
      vec2 warp = vec2(noise(flow), noise(flow + 17.3)) - 0.5;
      warp += 0.5 * (vec2(noise(flow * 2.3 + 5.1), noise(flow * 2.3 + 9.7)) - 0.5);
      // En el mismo paso, los tres colores se corren un poco cada uno para su lado.
      vec2 at = vUv + warp * 0.018 * amount;
      vec2 apart = split * vec2(cos(angle), sin(angle));
      vec3 color = vec3(texture2D(tDiffuse, at + apart).r, texture2D(tDiffuse, at).g, texture2D(tDiffuse, at - apart).b);

      float grain = hash(vUv * 900.0 + fract(time * 7.0)) - 0.5;
      color += grain * (0.05 + 0.04 * amount);
      color *= 1.0 - 0.6 * smoothstep(0.35, 0.85, length(vUv - 0.5));
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};
// Cuánto queda de cada cuadro en el siguiente: más alto, estela más larga.
const TRAIL = 0.78;

// En los cortes sin ataque, la probabilidad de que aparezcan las almas.
const SOULS_ALONE = 0.4;
// Alrededor de qué giran: el centro del cuerpo, en el piso.
const SOULS_CENTER = new THREE.Vector3(0, 0, 0);

// Se dibuja más chico y el navegador lo estira: con la distorsión no se nota y
// cuesta la mitad. Si igual no llega a fluir, baja solo hasta el mínimo.
const RENDER_SCALE = 0.75;
const MIN_RENDER_SCALE = 0.5;
const SLOW_FRAME_S = 1 / 45;
const FAST_FRAME_S = 1 / 57;
const ADAPT_EVERY_S = 2;

// La niebla volumétrica ya llena el aire: estas nubes quedan para el humo de la cintura.
const SMOKE_PUFFS = 18;
const EMBERS = 260;

/**
 * El Wekufe flotando en la oscuridad, entre humo y brasas, iluminado de abajo
 * en rojo. Corta de plano con los golpes y en algunos cortes ataca. Lo dibuja
 * three.js en un canvas propio, encima del de p5.
 */
export class WekufeScene implements Scene {
  private renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.05, 60);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private scale = RENDER_SCALE;
  private frameTime = 1 / 60;
  private sinceAdapt = 0;
  private heat: ShaderPass;
  private fog: Fog;
  private distortion = 0;
  // En manual no corta ni ataca solo: espera al panel.
  private auto = true;
  private cue: number | null = null;
  private scream = 0;
  private pulse: Pulse;

  private under = new THREE.PointLight(0xff2a10, 0, 6, 1.6);
  private rim = new THREE.SpotLight(0x9cb2ff, 0, 12, 0.5, 0.6, 1);
  private strobe = new THREE.DirectionalLight(0xffffff, 0);
  private smoke: THREE.Sprite[] = [];
  private embers: THREE.Points;
  private souls = new Souls();

  private body: THREE.Object3D | null = null;
  private head: THREE.Object3D | null = null;
  private claws: Claws | null = null;
  private aims = new Map<string, { release: number; yaw: number }>();
  private followed = new THREE.Vector3(0, 1.6, 0);
  private glow: THREE.MeshStandardMaterial[] = [];
  private mixer: THREE.AnimationMixer | null = null;
  private clips = new Map<string, THREE.AnimationAction>();
  private playing: THREE.AnimationAction | null = null;
  private disposed = false;

  private shot = 0;
  private sinceCut = 0;
  private beats = 0;
  private cuts = 0;
  private flash = 0;
  private kick = 0;
  private glitch = 0;
  private clock = 0;

  constructor(private readonly p: p5, mic: Microphone) {
    this.pulse = new Pulse(mic);
    const canvas = this.renderer.domElement;
    canvas.className = "web";
    canvas.style.pointerEvents = "none";
    // Al principio del body, para que los avisos de la pantalla queden encima.
    document.body.prepend(canvas);
    this.renderer.setPixelRatio(1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.16);
    this.scene.add(new THREE.HemisphereLight(0x3a1c22, 0x000000, 0.6));
    this.under.position.set(0, 0.8, 1.3);
    this.rim.position.set(-0.6, 3.4, -2.6);
    this.rim.target.position.set(0, 1.2, 0);
    this.strobe.position.set(0.4, 1.6, 3);
    this.scene.add(this.under, this.rim, this.rim.target, this.strobe);

    this.addSmoke();
    this.scene.add(this.souls.group);
    this.embers = this.addEmbers();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Antes del brillo, para que la niebla iluminada de rojo también brille.
    this.fog = new Fog(this.under.position);
    this.composer.addPass(this.fog.pass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.9, 0.5, 0.2);
    // El brillo es borroso igual: a la mitad de resolución que el resto se ve parecido y cuesta un cuarto.
    const sizeBloom = this.bloom.setSize.bind(this.bloom);
    this.bloom.setSize = (width, height) => sizeBloom(Math.ceil(width / 2), Math.ceil(height / 2));
    this.composer.addPass(this.bloom);
    this.composer.addPass(new AfterimagePass(TRAIL));
    this.heat = new ShaderPass(HEAT_SHADER);
    this.composer.addPass(this.heat);
    this.composer.addPass(new OutputPass());
    this.resize();

    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => this.place(gltf.scene, gltf.animations),
      undefined,
      (error) => console.error("[wekufe] no se pudo cargar el modelo", error)
    );
  }

  setParams(params: EffectParams) {
    const { brightness, contrast, saturation, distortion } = params;
    this.distortion = distortion;
    this.auto = params.wekufeAuto;
    if (!this.auto) {
      const shot = WEKUFE_SHOT_IDS.indexOf(params.wekufeShot);
      if (shot !== this.shot) {
        this.shot = shot;
        this.sinceCut = 0;
      }
    }
    // El pedido que ya estaba al crearse la escena es viejo: no se repite.
    if (params.wekufeCue !== this.cue) {
      const fresh = this.cue !== null && params.wekufeCue > 0;
      this.cue = params.wekufeCue;
      if (fresh) this.perform(params.wekufeMove);
    }
    // Un filtro, aunque no cambie nada, le suma trabajo al navegador en cada cuadro.
    const neutral = brightness === 1 && contrast === 1 && saturation === 1;
    this.renderer.domElement.style.filter = neutral
      ? ""
      : `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const drawn = (size: number) => Math.round(size * this.scale);
    this.renderer.setSize(drawn(width), drawn(height), false);
    this.composer.setSize(drawn(width), drawn(height));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    this.renderer.domElement.remove();
    this.scene.traverse((node) => {
      const mesh = node as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      for (const each of Array.isArray(material) ? material : material ? [material] : []) {
        for (const value of Object.values(each)) if (value instanceof THREE.Texture) value.dispose();
        each.dispose();
      }
    });
    this.fog.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }

  draw() {
    // Tope para que volver de una pestaña oculta no pegue un salto.
    const dt = Math.min(this.p.deltaTime / 1000, 0.1);
    this.clock += dt;
    this.adapt(dt);
    if (this.pulse.update(dt)) this.onBeat();
    const level = this.pulse.level;
    this.flash *= Math.exp(-7 * dt);
    this.kick *= Math.exp(-9 * dt);
    this.glitch *= Math.exp(-12 * dt);

    this.sinceCut += dt;
    if (this.auto && this.sinceCut > CUT_EVERY_S) this.cut();

    this.mixer?.update(dt * (0.85 + 0.4 * level));
    this.keepFacing(dt);
    const blow = this.clips.get("zarpazo");
    this.claws?.update(dt, blow, this.playing === blow, this.camera.position);
    // Mientras grita, la imagen se sacude y se deforma más.
    const screaming = this.playing === this.clips.get(SCREAM) ? 1 : 0;
    this.scream += (screaming - this.scream) * Math.min(1, 4 * dt);
    this.light(level);
    this.drift(dt, level);
    this.souls.update(dt, level, this.flash, this.camera, SOULS_CENTER);
    this.frame(dt, level);
    this.fog.update(this.camera, this.clock, this.under.intensity / 5, this.flash, 1 + 0.4 * level);
    this.composer.render();
  }

  // Lanzar e invocar vienen de Mixamo haciendo el gesto hacia un costado (en el
  // juego se da vuelta hacia Inti igual). Acá tienen que ir a la cámara: el
  // cuerpo gira de a poco para que, cuando las manos llegan más lejos, apunten
  // de frente, y después vuelve.
  private keepFacing(dt: number) {
    const body = this.body;
    if (!body) return;
    const action = this.playing;
    const aim = action && this.aims.get(action.getClip().name);
    if (!aim) {
      body.rotation.y += (0 - body.rotation.y) * Math.min(1, 6 * dt);
      return;
    }
    const duration = action.getClip().duration;
    const t = action.time;
    const toward =
      t < aim.release
        ? smooth(t / aim.release)
        : 1 - smooth((t - aim.release) / Math.max(0.01, (duration - aim.release) * 0.8));
    body.rotation.y = -aim.yaw * toward;
  }

  // Para cada animación que hay que enderezar: cuándo las manos llegan más
  // lejos del pecho y hacia dónde apuntan entonces, medido sin girar el cuerpo.
  private measureAims(model: THREE.Object3D, animations: THREE.AnimationClip[]) {
    const body = this.body!;
    const bones = ["L_Hand", "R_Hand", "L_Clavicle", "R_Clavicle"].map((name) => model.getObjectByName(name));
    if (bones.some((bone) => !bone)) return;
    const [leftHand, rightHand, leftShoulder, rightShoulder] = bones as THREE.Object3D[];
    const at = (bone: THREE.Object3D) => body.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
    const sampler = new THREE.AnimationMixer(model);

    for (const clip of animations) {
      if (!FACING_CLIPS.includes(clip.name)) continue;
      sampler.clipAction(clip).play();
      let best = { reach: -1, release: 0, yaw: 0 };
      for (let k = 0; k <= AIM_SAMPLES; k++) {
        const time = (clip.duration * k) / AIM_SAMPLES;
        sampler.setTime(time);
        body.updateMatrixWorld(true);
        const hands = at(leftHand).add(at(rightHand)).multiplyScalar(0.5);
        const chest = at(leftShoulder).add(at(rightShoulder)).multiplyScalar(0.5);
        const way = hands.sub(chest);
        const reach = Math.hypot(way.x, way.z);
        if (reach > best.reach) best = { reach, release: time, yaw: Math.atan2(way.x, way.z) };
      }
      sampler.stopAllAction();
      this.aims.set(clip.name, { release: Math.max(0.05, best.release), yaw: best.yaw });
    }
    sampler.uncacheRoot(model);
  }

  // Baja la resolución si los cuadros tardan, y la vuelve a subir si sobra.
  private adapt(dt: number) {
    this.frameTime += (dt - this.frameTime) * 0.05;
    this.sinceAdapt += dt;
    if (this.sinceAdapt < ADAPT_EVERY_S) return;
    let next = this.scale;
    if (this.frameTime > SLOW_FRAME_S) next = Math.max(MIN_RENDER_SCALE, this.scale - 0.1);
    else if (this.frameTime < FAST_FRAME_S) next = Math.min(RENDER_SCALE, this.scale + 0.05);
    this.sinceAdapt = 0;
    if (next === this.scale) return;
    this.scale = next;
    this.resize();
  }

  private onBeat() {
    this.beats += 1;
    this.flash = 1;
    this.kick = 1;
    if (this.beats % GLITCH_EVERY_BEATS === 0) this.glitch = 1;
    if (this.auto && this.beats % CUT_EVERY_BEATS === 0) this.cut();
  }

  // Corta a otro plano y, cada tanto, ataca.
  private cut() {
    this.cuts += 1;
    this.sinceCut = 0;
    let next = this.shot;
    while (next === this.shot) next = Math.floor(Math.random() * SHOTS.length);
    this.shot = next;

    if (!this.mixer || this.cuts % 2 === 1) {
      // Entre ataques, a veces aparecen las almas solas, más tenues.
      if (Math.random() < SOULS_ALONE) this.souls.summon(0.55);
      return;
    }
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    if (action === "zarpazo") this.shot = SCARE_SHOT;
    if (action === SCREAM) this.shot = SCREAM_SHOT;
    this.perform(action as WekufeMove);
  }

  // Lo que pide el panel o el automático. A mano no cambia el plano: lo elige quien maneja.
  private perform(move: WekufeMove) {
    if (move === "almas") {
      this.souls.summon();
      return;
    }
    if (move === "invocar") this.souls.summon();
    this.play(move, move !== IDLE);
  }

  private play(name: string, once: boolean) {
    const action = this.clips.get(name);
    if (!action) return;
    action.reset();
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = once;
    action.play();
    if (this.playing && this.playing !== action) action.crossFadeFrom(this.playing, 0.2, false);
    this.playing = action;
  }

  private place(model: THREE.Object3D, animations: THREE.AnimationClip[]) {
    if (this.disposed) return;
    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of animations) this.clips.set(clip.name, this.mixer.clipAction(clip));
    this.mixer.addEventListener("finished", () => this.play(IDLE, false));
    this.play(IDLE, false);
    this.mixer.update(0);

    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.roughness = 0.55;
      if (material.emissiveMap) this.glow.push(material);
    });

    // Lo pone de pie sobre el origen, con la altura fija.
    const box = visibleBox(model);
    model.scale.multiplyScalar(HEIGHT / box.getSize(new THREE.Vector3()).y);
    box.copy(visibleBox(model));
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    // Flota con el grupo, para no pisar el centrado del modelo.
    this.body = new THREE.Group().add(model);
    this.claws = new Claws(model);
    this.measureAims(model, animations);
    // Vuelve a la pose de reposo, que la medición cambió.
    this.mixer.update(0);
    this.scene.add(this.claws.group);
    model.traverse((node) => {
      if ((node as THREE.Bone).isBone && node.name === "Head") this.head = node;
    });
    this.scene.add(this.body);
  }

  private light(level: number) {
    // Casi todo oscuro: lo saca de la noche la luz roja de abajo y el destello de cada golpe.
    this.under.intensity = 5 + 8 * level + 6 * this.flash;
    this.rim.intensity = 14 + 24 * level;
    this.strobe.intensity = 5 * this.flash * this.flash;
    for (const material of this.glow) material.emissiveIntensity = 1.2 + 2.5 * level + 3 * this.flash;
    this.bloom.strength = 0.7 + 0.6 * level + 0.8 * this.flash;
    this.heat.uniforms.split.value = 0.0012 + 0.014 * this.glitch + 0.003 * this.kick;
    this.heat.uniforms.angle.value = this.clock * 1.3;
    // El slider Distorsión del panel la suma a una base que siempre está.
    this.heat.uniforms.amount.value =
      (0.6 + 2.4 * this.distortion) * (1 + 0.8 * level + 1.5 * this.kick + 1.8 * this.scream);
    this.heat.uniforms.time.value = this.clock;
    if (this.body) this.body.position.y = -0.04 + Math.sin(this.clock * 0.9) * 0.05;
  }

  private frame(dt: number, level: number) {
    const shot = SHOTS[this.shot];
    const from = new THREE.Vector3(...shot.from);
    const at = new THREE.Vector3(...shot.at);
    from.lerp(at, Math.min(DOLLY_MAX, this.sinceCut * DOLLY_PER_S * (1 + level)));
    if (this.head && this.scream > 0.01) {
      // Suave, para que siga la cabeza sin copiar cada sacudón.
      this.followed.lerp(this.head.getWorldPosition(new THREE.Vector3()), Math.min(1, 5 * dt));
      const face = this.followed.clone().add(SCREAM_LOOK);
      at.lerp(face, this.scream);
      from.lerp(face.clone().add(SCREAM_FROM), this.scream);
    }
    // Cámara en mano, que tiembla más con cada golpe.
    const shake = 0.006 + 0.012 * level + 0.05 * this.kick + 0.03 * this.scream;
    from.x += Math.sin(this.clock * 1.7) * shake + (Math.random() - 0.5) * shake * this.kick;
    from.y += Math.sin(this.clock * 2.3 + 1) * shake;
    this.camera.position.copy(from);
    this.camera.fov = shot.fov * (1 - 0.06 * this.kick);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(at);
  }

  // Humo bajo la cintura y alrededor, que sube despacio y vuelve a empezar.
  private addSmoke() {
    const texture = softDot("rgba(255,255,255,1)", "rgba(255,255,255,0)");
    for (let i = 0; i < SMOKE_PUFFS; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: new THREE.Color().setHSL(0, 0.3, 0.015 + Math.random() * 0.03),
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        fog: true,
      });
      const puff = new THREE.Sprite(material);
      puff.userData = { angle: Math.random() * Math.PI * 2, reach: 0.15 + Math.random() * 0.7, age: Math.random() };
      this.smoke.push(puff);
      this.scene.add(puff);
    }
  }

  private addEmbers(): THREE.Points {
    const positions = new Float32Array(EMBERS * 3);
    for (let i = 0; i < EMBERS; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = Math.random() * 4 - 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      map: softDot("rgba(255,160,80,1)", "rgba(255,40,0,0)"),
      size: 0.05,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xff5a22,
    });
    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    return points;
  }

  private drift(dt: number, level: number) {
    for (const puff of this.smoke) {
      const data = puff.userData as { angle: number; reach: number; age: number };
      data.age = (data.age + dt * (0.06 + 0.08 * level)) % 1;
      data.angle += dt * 0.15;
      const size = 0.5 + data.age * 0.9;
      puff.position.set(Math.cos(data.angle) * data.reach, -0.6 + data.age * 1.1, Math.sin(data.angle) * data.reach * 0.8);
      puff.scale.set(size, size, 1);
      (puff.material as THREE.SpriteMaterial).opacity = 0.5 * Math.sin(data.age * Math.PI);
    }

    const positions = this.embers.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < EMBERS; i++) {
      let y = positions.getY(i) + dt * (0.25 + 0.8 * level);
      if (y > 3) y = -1;
      positions.setY(i, y);
      positions.setX(i, positions.getX(i) + Math.sin(this.clock + i) * dt * 0.05);
    }
    positions.needsUpdate = true;
    (this.embers.material as THREE.PointsMaterial).size = 0.04 + 0.04 * level + 0.03 * this.flash;
  }
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

// Lo que se ve del modelo ya posado. Box3 cuenta también los huesos de las
// piernas, que no tienen malla: el demonio termina en la cintura.
function visibleBox(model: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  const vertex = new THREE.Vector3();
  model.updateMatrixWorld(true);
  model.traverse((node) => {
    const mesh = node as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    const count = mesh.geometry.getAttribute("position").count;
    for (let i = 0; i < count; i += 5) {
      mesh.getVertexPosition(i, vertex);
      box.expandByPoint(vertex.applyMatrix4(mesh.matrixWorld));
    }
  });
  return box;
}

// Una mancha redonda y difusa, para humo y brasas.
function softDot(inner: string, outer: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
