import {
  SCENE_IDS,
  SCENES,
  ScreenContent,
  ScreenState,
  SHADER_IDS,
  ShaderId,
  SHADERS,
  SourceState,
  sameContent,
  videoName,
} from "../../shared/protocol";
import { Send } from "./useHub";

interface Props {
  videos: string[];
  sources: SourceState[];
  chosen: ScreenState[];
  shader: ShaderId;
  origin: string;
  onPlay(content: ScreenContent): void;
  send: Send;
}

export function Sources({ videos, sources, chosen, shader, origin, onPlay, send }: Props) {
  const none = chosen.length === 0;
  // Marca lo que ya está sonando en todas las pantallas elegidas.
  const playing = (content: ScreenContent) =>
    !none && chosen.every((screen) => sameContent(screen.content, content));
  const playingVideo = (url: string) =>
    !none && chosen.every((s) => s.content.kind === "video" && s.content.url === url);

  return (
    <section class="panel">
      <div class="panel-head">
        <h2>Qué mostrar</h2>
        <p class="panel-note">
          {none
            ? "Elegí una o más pantallas arriba y después tocá qué mandarles."
            : `Se manda a ${chosen.map((screen) => screen.id).join(", ")}.`}
        </p>
      </div>

      <div class="group">
        <div class="group-head">
          <h3>Loops</h3>
          <button class="quiet" onClick={() => send({ t: "refresh-videos" })}>
            Actualizar lista
          </button>
        </div>
        {videos.length === 0 ? (
          <p class="empty">
            No hay loops. Copiá tus videos a la carpeta <code>public/videos</code> y tocá
            “Actualizar lista”.
          </p>
        ) : (
          <ul class="loops">
            {videos.map((url) => (
              <li key={url}>
                <button
                  class="loop"
                  disabled={none}
                  aria-pressed={playingVideo(url)}
                  onClick={() => onPlay({ kind: "video", url, shader })}
                  onMouseEnter={(event) => event.currentTarget.querySelector("video")?.play()}
                  onMouseLeave={(event) => event.currentTarget.querySelector("video")?.pause()}
                >
                  {/* #t pide un frame para que la miniatura no quede en negro. */}
                  <video src={`${url}#t=0.1`} muted loop playsInline preload="metadata" />
                  <span>{videoName(url)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div class="group">
        <div class="group-head">
          <h3>Escenas generativas</h3>
          <p class="panel-note">Reaccionan al micrófono de cada pantalla.</p>
        </div>
        <div class="chips">
          {SCENE_IDS.map((scene) => (
            <button
              key={scene}
              disabled={none}
              aria-pressed={playing({ kind: "scene", scene })}
              onClick={() => onPlay({ kind: "scene", scene })}
            >
              {SCENES[scene]}
            </button>
          ))}
        </div>
      </div>

      <div class="group">
        <div class="group-head">
          <h3>Cámaras</h3>
        </div>
        {sources.length === 0 ? (
          <p class="empty">
            Ninguna cámara conectada. Abrí <code>{origin}/cam/nombre</code> en la máquina que tiene
            la cámara.
          </p>
        ) : (
          <ul class="cams">
            {sources.map((source) => (
              <li key={source.id} class={source.online ? "" : "cam-offline"}>
                <span class="cam-name">{source.id}</span>
                {source.online ? (
                  <>
                    <label class="cam-shader">
                      <span>Efecto</span>
                      <select
                        value={source.shader}
                        onChange={(event) =>
                          send({
                            t: "set-source-shader",
                            source: source.id,
                            shader: event.currentTarget.value as ShaderId,
                          })
                        }
                      >
                        {SHADER_IDS.map((id) => (
                          <option key={id} value={id}>
                            {SHADERS[id]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      disabled={none}
                      aria-pressed={playing({ kind: "stream", source: source.id })}
                      onClick={() => onPlay({ kind: "stream", source: source.id })}
                    >
                      Mostrar en vivo
                    </button>
                  </>
                ) : (
                  <>
                    <span class="panel-note">Sin conexión</span>
                    <button
                      class="quiet"
                      onClick={() => send({ t: "forget", role: "cam", id: source.id })}
                    >
                      Quitar
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
