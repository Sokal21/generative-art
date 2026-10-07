// Contrato entre el hub (server/) y los tres tipos de cliente (src/).

export const HUB_PATH = "/hub";

export const SHADERS = {
  red_effect: "Rojo",
  red_hue_with_waves: "Rojo con ondas",
  chromatic_aberration: "Aberración cromática",
  simple: "Gradiente",
} as const;
export type ShaderId = keyof typeof SHADERS;
export const SHADER_IDS = Object.keys(SHADERS) as ShaderId[];

export const SCENES = {
  curves: "Montañas",
  life: "Juego de la vida",
  rings: "Anillos",
  planet: "Planeta",
} as const;
export type SceneId = keyof typeof SCENES;
export const SCENE_IDS = Object.keys(SCENES) as SceneId[];

export interface EffectParams {
  brightness: number;
  contrast: number;
  saturation: number;
  distortion: number;
  speed: number;
}
export type ParamKey = keyof EffectParams;

export const PARAMS: Record<ParamKey, { label: string; min: number; max: number; initial: number }> = {
  brightness: { label: "Brillo", min: 0, max: 2, initial: 1 },
  contrast: { label: "Contraste", min: 0, max: 2, initial: 1 },
  saturation: { label: "Saturación", min: 0, max: 2, initial: 1 },
  distortion: { label: "Distorsión", min: 0, max: 1, initial: 0 },
  speed: { label: "Velocidad", min: 0.25, max: 4, initial: 1.5 },
};
export const PARAM_KEYS = Object.keys(PARAMS) as ParamKey[];
export const DEFAULT_PARAMS = Object.fromEntries(
  PARAM_KEYS.map((key) => [key, PARAMS[key].initial])
) as unknown as EffectParams;

export type ScreenContent =
  // Recién conectada, nadie le asignó nada: muestra su nombre.
  | { kind: "idle" }
  | { kind: "blank" }
  | { kind: "video"; url: string; shader: ShaderId }
  | { kind: "scene"; scene: SceneId }
  | { kind: "stream"; source: string };

export interface ScreenState {
  id: string;
  online: boolean;
  content: ScreenContent;
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
  | { t: "report"; error: string | null }
  | { t: "signal"; to: string; data: Signal };

export type ServerMessage =
  | { t: "ping" }
  | { t: "replaced" }
  | { t: "state"; state: HubState }
  | { t: "screen"; content: ScreenContent; params: EffectParams; videos: string[] }
  | { t: "identify" }
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
  }
}

export function videoName(url: string): string {
  return decodeURIComponent(url.split("/").pop() ?? url).replace(/\.[^.]+$/, "");
}
