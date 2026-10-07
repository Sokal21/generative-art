import p5 from "p5";
import { SHADER_IDS, ShaderId } from "../../shared/protocol";
import { Microphone } from "../inputs/microphone";
import { Scene, SceneContext, SceneFactory } from "../scenes";

type Uniforms = Record<string, number | number[]>;

/** Dibuja `source` a pantalla completa pasándolo por `shader`. */
export function drawShaded(p: p5, shader: p5.Shader, source: p5.Element | null, uniforms: Uniforms) {
  p.shader(shader);
  if (source) shader.setUniform("tex0", source as any);
  shader.setUniform("resolution", [p.width, p.height]);
  shader.setUniform("time", p.millis() / 1000);
  for (const [name, value] of Object.entries(uniforms)) {
    shader.setUniform(name, value);
  }
  p.noStroke();
  p.rect(0, 0, p.width, p.height);
}

/** Un canvas p5 a pantalla completa que muestra una escena por vez. */
export class Runtime {
  readonly ready: Promise<void>;
  canvas!: HTMLCanvasElement;

  private scene: Scene | null = null;
  private factory: SceneFactory | null = null;
  private shaders = {} as Record<ShaderId, p5.Shader>;
  private microphone?: Microphone;

  private ctx!: SceneContext;

  constructor(parent: HTMLElement) {
    this.ready = new Promise((resolve) => {
      new p5((p: p5) => {
        this.ctx = {
          p,
          mic: () => (this.microphone ??= new Microphone("default", 1024)),
          shader: (id) => this.shaders[id],
        };

        p.preload = () => {
          for (const id of SHADER_IDS) {
            this.shaders[id] = p.loadShader(`/shaders/${id}/effect.vert`, `/shaders/${id}/effect.frag`);
          }
        };

        p.setup = () => {
          p.pixelDensity(1);
          this.canvas = p.createCanvas(window.innerWidth, window.innerHeight, p.WEBGL).elt;
          p.frameRate(60);
          resolve();
        };

        p.draw = () => {
          p.background(0);
          if (!this.scene) return;
          p.push();
          this.scene.draw();
          p.pop();
          p.resetShader();
        };

        p.windowResized = () => {
          p.resizeCanvas(window.innerWidth, window.innerHeight);
          if (this.scene?.resize) this.scene.resize();
          else this.show(this.factory);
        };
      }, parent);
    });
  }

  get current(): Scene | null {
    return this.scene;
  }

  show(factory: SceneFactory | null) {
    this.scene?.dispose();
    this.scene = null;
    this.factory = factory;
    if (!factory) return;
    try {
      this.scene = factory(this.ctx);
    } catch (error) {
      console.error("[runtime] no se pudo crear la escena", error);
    }
  }
}
