import { useState } from "preact/hooks";
import { parseWebUrl, ScreenContent, ScreenState } from "../../shared/protocol";

const STORAGE_KEY = "visuales:web-url";

function remembered(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

interface Props {
  chosen: ScreenState[];
  onPlay(content: ScreenContent): void;
}

export function WebSource({ chosen, onPlay }: Props) {
  const [text, setText] = useState(remembered);
  const url = parseWebUrl(text);
  const showing =
    url !== null &&
    chosen.length > 0 &&
    chosen.every((screen) => screen.content.kind === "web" && screen.content.url === url);

  return (
    <form
      class="web-source"
      onSubmit={(event) => {
        event.preventDefault();
        if (!url || chosen.length === 0) return;
        try {
          localStorage.setItem(STORAGE_KEY, text);
        } catch {}
        onPlay({ kind: "web", url });
      }}
    >
      <input
        type="text"
        inputMode="url"
        aria-label="Dirección de la web"
        placeholder="https://…"
        autoComplete="off"
        spellcheck={false}
        value={text}
        onInput={(event) => setText(event.currentTarget.value)}
      />
      <button type="submit" disabled={!url || chosen.length === 0} aria-pressed={showing}>
        Mostrar
      </button>
    </form>
  );
}
