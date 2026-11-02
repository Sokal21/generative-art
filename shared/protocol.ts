// Contrato entre el hub (server/) y los tres tipos de cliente (src/).

export const HUB_PATH = "/hub";
// Videos subidos desde el panel. Las pantallas los bajan antes de mostrarlos.
export const MEDIA_PATH = "/media";

export const isMedia = (url: string) => url.startsWith(`${MEDIA_PATH}/`);

export const SHADERS = {
  none: "Sin efecto",
  red_effect: "Rojo",
  red_hue_with_waves: "Rojo con ondas",
  chromatic_aberration: "Aberración cromática",
  simple: "Gradiente",
  kiss_cam: "Kiss cam",
} as const;
export type ShaderId = keyof typeof SHADERS;
export const SHADER_IDS = Object.keys(SHADERS) as ShaderId[];

export const SCENES = {
  curves: "Montañas",
  life: "Juego de la vida",
  rings: "Anillos",
  planet: "Planeta",
  tunnel: "Túnel fractal",
  skull: "Ángeles y demonios",
  alejo: "Alejo",
  criatura: "Criatura",
  wekufe: "Wekufe",
} as const;
export type SceneId = keyof typeof SCENES;
export const SCENE_IDS = Object.keys(SCENES) as SceneId[];

export const TUNNELS = {
  kaliset: "Caleidoscopio",
  cave: "Cueva",
  menger: "Menger",
  mandelbox: "Mandelbox",
  apollonian: "Apolonio",
  julia: "Julia en espiral",
  neon: "Neón",
} as const;
export type TunnelId = keyof typeof TUNNELS;
export const TUNNEL_IDS = Object.keys(TUNNELS) as TunnelId[];

export const FIGURES = {
  auto: "Rotar solas",
  skull: "Calavera",
  demon: "Demonio",
  angel: "Ángel",
  android: "Androide",
  creature: "Criatura",
  face: "Alejo",
} as const;
export type FigureId = keyof typeof FIGURES;

// Los planos y lo que puede hacer el Wekufe, para manejarlo a mano desde el panel.
export const WEKUFE_SHOTS = {
  low: "Desde abajo",
  face: "Cara",
  eyes: "Ojos",
  side: "Costado",
  above: "Desde arriba",
  behind: "Por detrás",
} as const;
export type WekufeShot = keyof typeof WEKUFE_SHOTS;
export const WEKUFE_SHOT_IDS = Object.keys(WEKUFE_SHOTS) as WekufeShot[];

export const WEKUFE_MOVES = {
  reposo: "Flotar",
  zarpazo: "Zarpazo",
  lanzar: "Lanzar",
  invocar: "Invocar",
  muerte: "Grito",
  almas: "Almas",
} as const;
export type WekufeMove = keyof typeof WEKUFE_MOVES;
export const WEKUFE_MOVE_IDS = Object.keys(WEKUFE_MOVES) as WekufeMove[];

export const AUTO_MODES = { off: "Manual", seconds: "Por segundos", beats: "Por golpes" } as const;
export type AutoMode = keyof typeof AUTO_MODES;

export interface EffectParams {
  brightness: number;
  contrast: number;
  saturation: number;
  distortion: number;
  speed: number;
  // Color elegido para el túnel, que se combina con su complementario. null: todos los tonos.
  color: string | null;
  fade: number;
  morph: number;
  autoEvery: number;
  tunnel: TunnelId;
  // El cambio de túnel espera al próximo golpe.
  onBeat: boolean;
  autoMode: AutoMode;
  // Qué muestra la escena Ángeles y demonios.
  figure: FigureId;
  // El Wekufe corta y ataca solo, o lo maneja el panel.
  wekufeAuto: boolean;
  wekufeShot: WekufeShot;
  // Lo último que se le pidió hacer. Cambia `wekufeCue` cada vez, para que el
  // mismo pedido dos veces seguidas se repita.
  wekufeMove: WekufeMove;
  wekufeCue: number;
}
export type ParamKey = Exclude<
  keyof EffectParams,
  "color" | "tunnel" | "onBeat" | "autoMode" | "figure" | "wekufeAuto" | "wekufeShot" | "wekufeMove" | "wekufeCue"
>;

export const PARAMS: Record<ParamKey, { label: string; min: number; max: number; initial: number; tunnel?: true }> = {
  brightness: { label: "Brillo", min: 0, max: 2, initial: 1 },
  contrast: { label: "Contraste", min: 0, max: 2, initial: 1 },
  saturation: { label: "Saturación", min: 0, max: 2, initial: 1 },
  distortion: { label: "Distorsión", min: 0, max: 1, initial: 0 },
  speed: { label: "Velocidad", min: 0.25, max: 4, initial: 1.5 },
  fade: { label: "Fundido (s)", min: 0, max: 4, initial: 1.5, tunnel: true },
  morph: { label: "Forma", min: 0, max: 1, initial: 0, tunnel: true },
  autoEvery: { label: "Cambiar cada", min: 1, max: 64, initial: 16, tunnel: true },
};
export const PARAM_KEYS = Object.keys(PARAMS) as ParamKey[];
export const DEFAULT_PARAMS = {
  ...Object.fromEntries(PARAM_KEYS.map((key) => [key, PARAMS[key].initial])),
  color: null,
  tunnel: "kaliset",
  onBeat: false,
  autoMode: "off",
  figure: "auto",
  wekufeAuto: true,
  wekufeShot: "low",
  wekufeMove: "reposo",
  wekufeCue: 0,
} as unknown as EffectParams;

export const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

export function hexToRgb(hex: string): number[] {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}

// Gira el tono 180° sin cambiar la saturación ni la luminosidad.
export function complementary(hex: string): string {
  const rgb = hexToRgb(hex);
  const pivot = Math.max(...rgb) + Math.min(...rgb);
  return `#${rgb.map((channel) => (pivot - channel).toString(16).padStart(2, "0")).join("")}`;
}

export type ScreenContent =
  // Recién conectada, nadie le asignó nada: muestra su nombre.
  | { kind: "idle" }
  | { kind: "blank" }
  | { kind: "video"; url: string; shader: ShaderId }
  | { kind: "scene"; scene: SceneId }
  | { kind: "stream"; source: string }
  | { kind: "web"; url: string };

export type VideoContent = Extract<ScreenContent, { kind: "video" }>;

// Video que la pantalla está bajando mientras sigue mostrando `content`. Las
// pantallas de una misma orden comparten `batch` y arrancan juntas.
export interface PendingVideo {
  content: VideoContent;
  batch: number;
  progress: number;
  ready: boolean;
}

export interface ScreenState {
  id: string;
  online: boolean;
  content: ScreenContent;
  pending: PendingVideo | null;
  params: EffectParams;
  error: string | null;
}

export interface SourceState {
  id: string;
  online: boolean;
  shader: ShaderId;
}

export interface HubState {
  screens: ScreenState[];
  sources: SourceState[];
  videos: string[];
  // IPs de la máquina que corre el hub, para armar las URLs de las otras.
  addresses: string[];
  // Algún panel está mandando su micrófono en lugar del de cada pantalla.
  remoteAudio: boolean;
}

// Una pantalla que tiene que recibir un stream. `session` cambia cada vez que
// la pantalla se reconecta, así la cámara sabe que tiene que volver a ofrecer.
export interface Viewer {
  id: string;
  session: number;
}

export type Signal =
  | { kind: "offer"; conn: string; sdp: string }
  | { kind: "answer"; conn: string; sdp: string }
  | { kind: "ice"; conn: string; candidate: RTCIceCandidateInit };

export type Hello =
  | { t: "hello"; role: "control" }
  // Las pantallas y cámaras mandan lo que estaban haciendo: si el hub se
  // reinició y no las conoce, adopta ese estado en vez de resetearlas.
  | { t: "hello"; role: "screen"; id: string; content?: ScreenContent; params?: EffectParams }
  | { t: "hello"; role: "cam"; id: string; shader?: ShaderId };

export type Role = Hello["role"];

export type ClientMessage =
  | Hello
  | { t: "pong" }
  | { t: "set-content"; screens: string[]; content: ScreenContent }
  | { t: "set-shader"; screens: string[]; shader: ShaderId }
  | { t: "set-params"; screens: string[]; params: Partial<EffectParams> }
  | { t: "set-source-shader"; source: string; shader: ShaderId }
  | { t: "identify"; screens: string[] }
  | { t: "forget"; role: "screen" | "cam"; id: string }
  | { t: "refresh-videos" }
  | { t: "audio-start" }
  | { t: "audio-stop" }
  | { t: "audio"; spectrum: string }
  | { t: "report"; error: string | null }
  | { t: "download"; url: string; progress: number; ready: boolean }
  | { t: "download-failed"; url: string; error: string }
  | { t: "signal"; to: string; data: Signal };

export type ServerMessage =
  | { t: "ping" }
  | { t: "replaced" }
  | { t: "state"; state: HubState }
  | {
      t: "screen";
      content: ScreenContent;
      // URL que tiene que bajar, si hay una orden en curso.
      pending: string | null;
      params: EffectParams;
      videos: string[];
    }
  | { t: "identify" }
  | { t: "audio-source"; remote: boolean }
  // Las frecuencias del micrófono del panel, en base64.
  | { t: "audio"; spectrum: string }
  // Otro panel empezó a mandar su micrófono: este tiene que dejar de hacerlo.
  | { t: "audio-taken" }
  | { t: "source"; shader: ShaderId }
  | { t: "viewers"; viewers: Viewer[] }
  | { t: "signal"; from: string; data: Signal };

export function sameContent(a: ScreenContent, b: ScreenContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function describeContent(content: ScreenContent): string {
  switch (content.kind) {
    case "idle":
      return "Sin asignar";
    case "blank":
      return "Apagada";
    case "video":
      return videoName(content.url);
    case "scene":
      return SCENES[content.scene];
    case "stream":
      return `Cámara ${content.source}`;
    case "web":
      return new URL(content.url).hostname;
  }
}

// Normaliza lo que se escribe en el panel. Solo http y https: un `javascript:`
// en un iframe correría dentro de la pantalla.
export function parseWebUrl(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function videoName(url: string): string {
  return decodeURIComponent(url.split("/").pop() ?? url).replace(/\.[^.]+$/, "");
}
