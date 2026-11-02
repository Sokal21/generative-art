import * as THREE from "three";

// Como en 1810-3D: la parte del zarpazo en la que las manos golpean (cuadros
// 22,5 a 27 de 51). Antes y después las manos vuelven y las líneas se enrulan.
const FROM = 22.5 / 51;
const TO = 27 / 51;
const LINES = 4;
// En unidades de la escena, para el demonio de 2 de alto.
const REACH = 0.3;
const GAP = 0.05;
const WIDE = 0.011;
const GLOW = 0.05;
// Cuánto duran una vez dado el golpe, y cuánto de eso el resplandor se ensancha.
const LASTS = 0.42;
const FLARE = 0.1;
const KEPT = 40;
const POINTS = 24;
const SPARKS = 48;

const LINE_COLOR = new THREE.Color(1.4, 0.1, 0.04);
const GLOW_COLOR = new THREE.Color(0.9, 0.04, 0.01);
const GLOW_BRIGHT = 0.3;

interface Hand {
  hand: THREE.Object3D;
  arm: THREE.Object3D;
  path: THREE.Vector3[];
  was: THREE.Vector3;
}

interface Spark {
  at: THREE.Vector3;
  way: THREE.Vector3;
  age: number;
  life: number;
}

const ribbonVertex = `
  attribute float clear;
  attribute float side;
  varying float vClear;
  varying float vAcross;
  void main() {
    vClear = clear;
    vAcross = side;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ribbonFragment = `
  uniform vec3 color;
  uniform float soft;
  varying float vClear;
  varying float vAcross;
  void main() {
    // El resplandor se apaga hacia los costados; la línea es pareja.
    float edge = mix(1.0, 1.0 - vAcross * vAcross, soft);
    gl_FragColor = vec4(color * vClear * edge, 1.0);
  }
`;

/**
 * Las líneas rojas que las garras del Wekufe rasgan en el aire durante el
 * zarpazo, siguiendo el camino real de cada mano, con chispas. Se van borrando
 * desde donde empezaron.
 */
export class Claws {
  readonly group = new THREE.Group();
  private hands: Hand[] = [];
  private count = 0;
  private since = -1;
  private wasTime = 0;
  private lines: THREE.Mesh;
  private glows: THREE.Mesh;
  private sparks: Spark[] = [];
  private sparkPoints: THREE.Points;

  private at = new THREE.Vector3();
  private way = new THREE.Vector3();
  private across = new THREE.Vector3();
  private toEye = new THREE.Vector3();

  constructor(body: THREE.Object3D) {
    for (const side of ["L_", "R_"]) {
      const hand = body.getObjectByName(side + "Hand");
      const arm = body.getObjectByName(side + "Forearm");
      if (!hand || !arm) continue;
      this.hands.push({ hand, arm, path: Array.from({ length: KEPT }, () => new THREE.Vector3()), was: new THREE.Vector3() });
    }
    const many = this.hands.length * LINES;
    this.lines = ribbon(many, LINE_COLOR, 0);
    this.glows = ribbon(many, GLOW_COLOR, 1);
    this.lines.visible = this.glows.visible = false;

    const positions = new Float32Array(SPARKS * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);
    this.sparkPoints = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: new THREE.Color(2.2, 0.5, 0.2),
        size: 0.035,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.sparkPoints.frustumCulled = false;
    this.group.add(this.glows, this.lines, this.sparkPoints);
  }

  /** `blow` es la acción del zarpazo; `striking`, si es la que está sonando. */
  update(dt: number, blow: THREE.AnimationAction | undefined, striking: boolean, eye: THREE.Vector3) {
    this.fly(dt);
    if (!blow) return;
    const time = blow.time;
    // Volvió a empezar: lo de antes se borra.
    if (time < this.wasTime) this.reset();
    this.wasTime = time;

    const share = time / blow.getClip().duration;
    if (striking && share >= FROM && share <= TO && this.since < 0) this.follow();
    else if (this.count >= 2) this.since = this.since < 0 ? 0 : this.since + dt;

    if (this.since >= LASTS) {
      this.reset();
      return;
    }
    if (this.count >= 2) this.draw(Math.max(0, this.since), eye);
  }

  private reset() {
    this.count = 0;
    this.since = -1;
    this.lines.visible = this.glows.visible = false;
  }

  // Dónde están ahora las puntas de las garras: un poco más allá de cada mano.
  private follow() {
    if (this.count >= KEPT) return;
    for (const h of this.hands) {
      h.hand.getWorldPosition(this.at);
      h.arm.getWorldPosition(this.way);
      this.way.subVectors(this.at, this.way).normalize();
      this.at.addScaledVector(this.way, REACH);
      if (this.count > 0) this.throwOff(this.at, this.way.subVectors(this.at, h.was));
      h.was.copy(this.at);
      h.path[this.count].copy(this.at);
    }
    this.count += 1;
  }

  private draw(since: number, eye: THREE.Vector3) {
    const gone = since / LASTS;
    const flare = since < FLARE ? 2 : 1;
    const linePositions = this.lines.geometry.getAttribute("position") as THREE.BufferAttribute;
    const lineClear = this.lines.geometry.getAttribute("clear") as THREE.BufferAttribute;
    const glowPositions = this.glows.geometry.getAttribute("position") as THREE.BufferAttribute;
    const glowClear = this.glows.geometry.getAttribute("clear") as THREE.BufferAttribute;
    const last = POINTS - 1;

    let line = 0;
    for (const h of this.hands) {
      const curve = new THREE.CatmullRomCurve3(h.path.slice(0, this.count));
      for (let c = 0; c < LINES; c++, line++) {
        // Una al lado de la otra, como garras; las de afuera, más cortas.
        const off = (c - (LINES - 1) / 2) * GAP;
        const short = 0.05 * Math.abs(c - (LINES - 1) / 2);
        for (let p = 0; p <= last; p++) {
          const u = p / last;
          const along = short + u * (1 - 2 * short);
          curve.getPointAt(along, this.at);
          curve.getTangentAt(along, this.way);
          this.across.crossVectors(this.way, this.toEye.subVectors(eye, this.at)).normalize();
          this.at.addScaledVector(this.across, off);

          // En punta en las dos puntas, y se vacía desde donde empezó.
          const body = Math.pow(Math.sin(Math.PI * u), 0.6);
          const clear = (u < gone ? 0 : 1) * (1 - gone * gone);
          const vertex = (line * POINTS + p) * 2;
          const wide = WIDE * body * (1 - gone * 0.6);
          const glow = GLOW * body * flare;
          put(linePositions, vertex, this.at, this.across, wide);
          put(glowPositions, vertex, this.at, this.across, glow);
          lineClear.setX(vertex, clear);
          lineClear.setX(vertex + 1, clear);
          glowClear.setX(vertex, clear * body * GLOW_BRIGHT);
          glowClear.setX(vertex + 1, clear * body * GLOW_BRIGHT);
        }
      }
    }
    for (const attribute of [linePositions, lineClear, glowPositions, glowClear]) attribute.needsUpdate = true;
    this.lines.visible = this.glows.visible = true;
  }

  private throwOff(from: THREE.Vector3, moved: THREE.Vector3) {
    for (let n = 0; n < 2; n++) {
      const fast = 1 + Math.random() * 2;
      const spark = this.sparks.length < SPARKS ? { at: new THREE.Vector3(), way: new THREE.Vector3(), age: 0, life: 0 } : null;
      const reused = spark ?? this.sparks.find((s) => s.age >= s.life);
      if (!reused) return;
      reused.at.copy(from);
      reused.way.copy(moved).normalize().multiplyScalar(fast);
      reused.way.x += (Math.random() - 0.5) * fast;
      reused.way.y += (Math.random() - 0.5) * fast;
      reused.way.z += (Math.random() - 0.5) * fast;
      reused.age = 0;
      reused.life = 0.2 + Math.random() * 0.3;
      if (spark) this.sparks.push(spark);
    }
  }

  // Las chispas frenan y caen.
  private fly(dt: number) {
    const positions = this.sparkPoints.geometry.getAttribute("position") as THREE.BufferAttribute;
    let shown = 0;
    for (const spark of this.sparks) {
      spark.age += dt;
      if (spark.age >= spark.life) continue;
      spark.way.multiplyScalar(Math.exp(-3 * dt));
      spark.way.y -= 3 * dt;
      spark.at.addScaledVector(spark.way, dt);
      positions.setXYZ(shown++, spark.at.x, spark.at.y, spark.at.z);
    }
    positions.needsUpdate = true;
    this.sparkPoints.geometry.setDrawRange(0, shown);
  }
}

// Cintas de dos vértices por punto, armadas como tiras de triángulos.
function ribbon(lines: number, color: THREE.Color, soft: number): THREE.Mesh {
  const vertices = lines * POINTS * 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
  geometry.setAttribute("clear", new THREE.BufferAttribute(new Float32Array(vertices), 1));
  geometry.setAttribute("side", new THREE.BufferAttribute(new Float32Array(vertices).map((_, i) => (i % 2) * 2 - 1), 1));
  const index: number[] = [];
  for (let line = 0; line < lines; line++) {
    for (let p = 0; p < POINTS - 1; p++) {
      const a = (line * POINTS + p) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  geometry.setIndex(index);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      uniforms: { color: { value: color }, soft: { value: soft } },
      vertexShader: ribbonVertex,
      fragmentShader: ribbonFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  mesh.frustumCulled = false;
  return mesh;
}

function put(positions: THREE.BufferAttribute, vertex: number, at: THREE.Vector3, across: THREE.Vector3, wide: number) {
  positions.setXYZ(vertex, at.x + across.x * wide, at.y + across.y * wide, at.z + across.z * wide);
  positions.setXYZ(vertex + 1, at.x - across.x * wide, at.y - across.y * wide, at.z - across.z * wide);
}
