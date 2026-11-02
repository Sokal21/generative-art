import {
  DEFAULT_PARAMS,
  EffectParams,
  isMedia,
  ScreenContent,
  sameContent,
  videoName,
} from "../../shared/protocol";
import { Runtime } from "../engine/runtime";
import { Connection } from "../net/connection";
import { cachedSource, download, probe, prune } from "../net/media";
import { StreamSubscriber } from "../net/rtc";
import { SCENE_FACTORIES } from "../scenes/registry";
import { StreamScene } from "../scenes/stream";
import { VideoScene } from "../scenes/video";
import { WebScene } from "../scenes/web";

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
  let params: EffectParams = { ...DEFAULT_PARAMS, ...remembered?.params };
  let shown: ScreenContent = { kind: "idle" };
  let identifyTimer: number | undefined;
  let offlineTimer: number | undefined;

  const connection = new Connection(() => ({ t: "hello", role: "screen", id, content, params }));
  const report = (error: string | null) => connection.send({ t: "report", error });
  runtime.followRemoteAudio(connection);

  const subscriber = new StreamSubscriber(connection, (stream) => {
    if (runtime.current instanceof StreamScene) runtime.current.attach(stream);
  });

  const showLabel = () => {
    label.hidden = content.kind !== "idle" && identifyTimer === undefined;
    (label.lastElementChild as HTMLElement).hidden = content.kind !== "idle";
  };

  showLabel();

  const apply = (next: ScreenContent, nextParams: EffectParams, source?: string) => {
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
        runtime.show((ctx) => new VideoScene(ctx, next.url, next.shader, params, report, source));
        break;
      case "scene":
        runtime.show(SCENE_FACTORIES[next.scene]);
        runtime.current?.setParams?.(params);
        break;
      case "stream":
        runtime.show(() => new StreamScene());
        break;
      case "web":
        runtime.show(() => new WebScene(next.url));
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

  // Baja el video de la orden en curso; lo que se ve no cambia hasta que el hub
  // avise que lo tienen todas. Una orden nueva cancela la anterior.
  let downloading: { url: string; abort: AbortController } | undefined;
  const follow = (url: string | null) => {
    if ((downloading?.url ?? null) === url) return;
    downloading?.abort.abort();
    downloading = undefined;
    if (!url) return;

    const job = { url, abort: new AbortController() };
    downloading = job;
    let percent = 0;
    const name = videoName(url);
    connection.send({ t: "download", url, progress: 0, ready: false });

    download(
      url,
      (progress) => {
        const next = Math.floor(progress * 100);
        if (next === percent) return;
        percent = next;
        // Hasta acá solo se bajó: falta confirmar que se puede reproducir.
        connection.send({ t: "download", url, progress, ready: false });
      },
      job.abort.signal
    )
      .catch((error) => {
        throw new Error(job.abort.signal.aborted ? "Cancelada" : `No se pudo bajar ${name}: ${error.message}`);
      })
      .then(() => cachedSource(url))
      .then((source) => {
        if (!source) throw new Error(`No se pudo guardar ${name}`);
        return probe(source).catch((error) => {
          throw new Error(`${name}: ${error.message}`);
        });
      })
      .then(() => {
        if (downloading !== job) return;
        downloading = undefined;
        connection.send({ t: "download", url, progress: 1, ready: true });
      })
      .catch((error) => {
        if (downloading !== job) return;
        downloading = undefined;
        console.error(error);
        connection.send({ t: "download-failed", url, error: error.message });
      });
  };

  const sourceFor = async (next: ScreenContent) => {
    if (next.kind !== "video" || !isMedia(next.url)) return undefined;
    // Si se borró de la caché, se reproduce directo del hub como cualquier loop.
    return (await cachedSource(next.url).catch(() => null)) ?? next.url;
  };

  let turn = 0;
  let knownMedia = "";
  connection.on("screen", async (message) => {
    follow(message.pending);

    const media = message.videos.filter(isMedia);
    if (media.join() !== knownMedia) {
      knownMedia = media.join();
      prune(media).catch(console.error);
    }

    // La conexión no espera a p5: una pestaña en segundo plano tarda en
    // arrancar el canvas, pero tiene que figurar en el panel igual.
    const mine = ++turn;
    await runtime.ready;
    const source = await sourceFor(message.content);
    if (mine !== turn) return;
    apply(message.content, message.params, source);
    // Lo subido se baja recién cuando llega la orden.
    preload(message.videos.filter((url) => !isMedia(url)));
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
