import { describeContent, SCENES, ScreenContent, ScreenState } from "../../shared/protocol";
import { Send } from "./useHub";

interface Props {
  screens: ScreenState[];
  selected: string[];
  origin: string;
  onToggle(id: string): void;
  onSelectAll(all: boolean): void;
  onPlay(content: ScreenContent): void;
  send: Send;
}

function Preview({ content }: { content: ScreenContent }) {
  switch (content.kind) {
    case "video":
      return <video class="tile-media" src={content.url} muted loop autoplay playsInline />;
    case "scene":
      return <div class="tile-fill tile-scene">{SCENES[content.scene]}</div>;
    case "stream":
      return <div class="tile-fill tile-stream">En vivo</div>;
    default:
      return <div class="tile-fill" />;
  }
}

export function Wall({ screens, selected, origin, onToggle, onSelectAll, onPlay, send }: Props) {
  const allSelected = screens.length > 0 && selected.length === screens.length;
  const none = selected.length === 0;

  return (
    <section class="panel">
      <div class="panel-head">
        <h2>Pantallas</h2>
        <div class="actions">
          <button disabled={screens.length === 0} onClick={() => onSelectAll(!allSelected)}>
            {allSelected ? "Soltar todas" : "Elegir todas"}
          </button>
          <button disabled={none} onClick={() => send({ t: "identify", screens: selected })}>
            Mostrar nombres
          </button>
          <button disabled={none} onClick={() => onPlay({ kind: "blank" })}>
            Apagar
          </button>
        </div>
      </div>

      {screens.length === 0 ? (
        <p class="empty">
          Todavía no hay pantallas. Abrí <code>{origin}/screen/nombre</code> en cada máquina que
          proyecta y van a aparecer acá.
        </p>
      ) : (
        <ul class="wall">
          {screens.map((screen) => {
            const isSelected = selected.includes(screen.id);
            return (
              <li key={screen.id} class={`tile ${screen.online ? "" : "tile-offline"}`}>
                <button
                  class="tile-pick"
                  aria-pressed={isSelected}
                  onClick={() => onToggle(screen.id)}
                >
                  <span class="tile-frame">
                    <Preview content={screen.content} />
                    {!screen.online && <span class="tile-flag">Sin conexión</span>}
                  </span>
                  <span class="tile-name">{screen.id}</span>
                  <span class={`tile-what ${screen.error ? "fault" : ""}`}>
                    {screen.error ?? describeContent(screen.content)}
                  </span>
                </button>
                {!screen.online && (
                  <button
                    class="tile-forget"
                    onClick={() => send({ t: "forget", role: "screen", id: screen.id })}
                  >
                    Quitar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
