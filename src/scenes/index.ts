import p5 from "p5";
import { EffectParams, ShaderId } from "../../shared/protocol";
import { Microphone } from "../inputs/microphone";

export interface Scene {
  draw(): void;
  dispose(): void;
  setParams?(params: EffectParams): void;
  // Las escenas que no lo implementan se reconstruyen al cambiar el tamaño.
  resize?(): void;
}

export interface SceneContext {
  p: p5;
  // El micrófono se pide recién cuando una escena lo usa.
  mic(): Microphone;
  shader(id: ShaderId): p5.Shader;
}

export type SceneFactory = (ctx: SceneContext) => Scene;
