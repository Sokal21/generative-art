import {
  DEFAULT_PARAMS,
  EffectParams,
  ScreenContent,
  sameContent,
} from "../../shared/protocol";
import { Runtime } from "../engine/runtime";
import { Connection } from "../net/connection";
import { StreamSubscriber } from "../net/rtc";
import { SCENE_FACTORIES } from "../scenes/registry";
import { StreamScene } from "../scenes/stream";
import { VideoScene } from "../scenes/video";

const IDENTIFY_MS = 4000;
// Los cortes cortos no se anuncian sobre la proyección.
const OFFLINE_NOTICE_MS = 3000;

export function startScreen(root: HTMLElement, id: string) {
  document.title = `Pantalla ${id}`;
  document.body.classList.add("stage");

  const label = document.createElement("div");
  label.className = "stage-label";
  label.innerHTML = `<span></span><small>Esperando al panel de control</small>`;
  label.firstElementChild!.textContent = id;

  const status = document.createElement("div");
  status.className = "stage-status";
  status.hidden = true;
  document.body.append(label, status);

  const runtime = new Runtime(root);

  // Lo último que mostró esta pantalla sobrevive a una recarga: si el hub
  // también se reinició, así recupera qué tenía cada una.
  const storageKey = `visuales:screen:${id}`;
  const remembered = JSON.parse(localStorage.getItem(storageKey) ?? "null");
  let content: ScreenContent = remembered?.content ?? { kind: "idle" };
  let params: EffectParams = remembered?.params ?? DEFAULT_PARAMS;
  let shown: ScreenContent = { kind: "idle" };
  let identifyTimer: number | undefined;
  let offlineTimer: number | undefined;

  const connection = new Connection(() => ({ t: "hello", role: "screen", id, content, params }));
  const report = (error: string | null) => connection.send({ t: "report", error });

  const subscriber = new StreamSubscriber(connection, (stream) => {
    if (runtime.current instanceof StreamScene) runtime.current.attach(stream);
  });

  const showLabel = () => {
    label.hidden = content.kind !== "idle" && identifyTimer === undefined;
    (label.lastElementChild as HTMLElement).hidden = content.kind !== "idle";
  };

  showLabel();

  const apply = (next: ScreenContent, nextParams: EffectParams) => {
    const previous = shown;
    content = shown = next;
    params = nextParams;
    localStorage.setItem(storageKey, JSON.stringify({ content, params }));
    showLabel();

    const scene = runtime.current;
    if (sameContent(previous, next)) {
      scene?.setParams?.(params);
      return;
    }
    // Mismo loop con otro shader: se cambia sin reiniciar el video.
    if (next.kind === "video" && scene instanceof VideoScene && scene.url === next.url) {
      scene.setShader(next.shader);
      scene.setParams(params);
      return;
    }

    subscriber.watch(next.kind === "stream" ? next.source : null);
    switch (next.kind) {
      case "idle":
      case "blank":
        runtime.show(null);
        break;
      case "video":
        runtime.show((ctx) => new VideoScene(ctx, next.url, next.shader, params, report));
        break;
      case "scene":
        runtime.show(SCENE_FACTORIES[next.scene]);
        break;
      case "stream":
        runtime.show(() => new StreamScene());
        break;
    }
  };

  // Deja los loops en la caché del navegador para que arranquen al instante.
  const preloaded = new Map<string, HTMLVideoElement>();
  const preload = (urls: string[]) => {
    for (const url of urls) {
      if (preloaded.has(url)) continue;
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.src = url;
      preloaded.set(url, video);
    }
  };

  connection.on("screen", async (message) => {
    // La conexión no espera a p5: una pestaña en segundo plano tarda en
    // arrancar el canvas, pero tiene que figurar en el panel igual.
    await runtime.ready;
    apply(message.content, message.params);
    preload(message.videos);
  });

  connection.on("identify", () => {
    clearTimeout(identifyTimer);
    identifyTimer = window.setTimeout(() => {
      identifyTimer = undefined;
      showLabel();
    }, IDENTIFY_MS);
    showLabel();
  });

  connection.onStatus((state) => {
    clearTimeout(offlineTimer);
    status.hidden = true;
    if (state === "replaced") {
      status.textContent = `Otra ventana se abrió como “${id}”. Esta quedó desconectada.`;
      status.hidden = false;
    } else if (state === "offline") {
      offlineTimer = window.setTimeout(() => {
        status.textContent = "Sin conexión con el panel. Reintentando…";
        status.hidden = false;
      }, OFFLINE_NOTICE_MS);
    }
  });
}
