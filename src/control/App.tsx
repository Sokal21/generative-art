import { useEffect, useState } from "preact/hooks";
import { ScreenContent, ShaderId } from "../../shared/protocol";
import { Look } from "./Look";
import { Sources } from "./Sources";
import { useHub } from "./useHub";
import { Wall } from "./Wall";

const STATUS_TEXT = {
  connecting: "Conectando…",
  online: "Conectado",
  offline: "Sin conexión, reintentando…",
  replaced: "Desconectado",
};

export function App() {
  const { state, status, send } = useHub();
  const [selected, setSelected] = useState<string[]>([]);
  // Shader con el que salen los próximos loops.
  const [shader, setShader] = useState<ShaderId>("red_effect");

  const screens = state?.screens ?? [];
  const chosen = screens.filter((screen) => selected.includes(screen.id));
  const chosenIds = chosen.map((screen) => screen.id);

  // Con una sola pantalla no hay nada que elegir.
  useEffect(() => {
    if (screens.length === 1 && selected.length === 0) setSelected([screens[0].id]);
  }, [screens.length]);

  const toggle = (id: string) =>
    setSelected((ids) => (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id]));

  const play = (content: ScreenContent) => send({ t: "set-content", screens: chosenIds, content });

  const host = state?.addresses[0] ?? location.hostname;
  const origin = `${location.protocol}//${host}${location.port ? `:${location.port}` : ""}`;

  return (
    <div class="control">
      <header class="bar">
        <h1>Panel de control</h1>
        <span class={`link link-${status}`} role="status">
          {STATUS_TEXT[status]}
        </span>
        <p class="bar-hint">
          Para sumar una pantalla, abrí <code>{origin}/screen/nombre</code> en esa máquina.
        </p>
      </header>

      <main class="layout">
        <div class="layout-main">
          <Wall
            screens={screens}
            selected={chosenIds}
            origin={origin}
            onToggle={toggle}
            onSelectAll={(all) => setSelected(all ? screens.map((screen) => screen.id) : [])}
            onPlay={play}
            send={send}
          />
          <Sources
            videos={state?.videos ?? []}
            sources={state?.sources ?? []}
            chosen={chosen}
            shader={shader}
            origin={origin}
            onPlay={play}
            send={send}
          />
        </div>
        <Look
          chosen={chosen}
          shader={shader}
          onShader={(next) => {
            setShader(next);
            send({ t: "set-shader", screens: chosenIds, shader: next });
          }}
          send={send}
        />
      </main>
    </div>
  );
}
