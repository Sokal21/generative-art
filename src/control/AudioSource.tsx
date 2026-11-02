import { useEffect, useRef, useState } from "preact/hooks";
import { Microphone } from "../inputs/microphone";
import { Status } from "../net/connection";
import { Send } from "./useHub";

const SEND_EVERY_MS = 33;
const METER_GAIN = 6;

// En una pestaña oculta el navegador frena los timers a uno por segundo, y el
// panel tiene que seguir mandando aunque se esté mirando otra cosa. En un worker no.
function startTicker(tick: () => void): () => void {
  const code = `setInterval(() => postMessage(0), ${SEND_EVERY_MS})`;
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  worker.onmessage = tick;
  return () => worker.terminate();
}

interface Props {
  // Otro panel está mandando su micrófono.
  remoteAudio: boolean;
  status: Status;
  audioTaken: number;
  send: Send;
}

export function AudioSource({ remoteAudio, status, audioTaken, send }: Props) {
  const [on, setOn] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const meter = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!on) return;
    const microphone = new Microphone("default", 1024);
    let stopTicker: (() => void) | undefined;
    let cancelled = false;

    microphone
      .open()
      .then(() => {
        if (cancelled) return;
        stopTicker = startTicker(() => {
          const spectrum = microphone.spectrum();
          send({ t: "audio", spectrum });
          // Un tema a todo volumen promedia bastante menos que el máximo: se amplifica para que se note.
          const level = (microphone.getAverageVolume() / 255) * METER_GAIN;
          if (meter.current) meter.current.style.width = `${Math.min(100, level * 100)}%`;
        });
      })
      .catch((error) => {
        console.error(error);
        setOn(false);
        setNote("No se pudo abrir el micrófono. Revisá el permiso del navegador.");
      });

    return () => {
      cancelled = true;
      stopTicker?.();
      microphone.close();
      send({ t: "audio-stop" });
    };
  }, [on]);

  // Se vuelve a anunciar en cada conexión: si el hub se reinició, no lo sabe.
  useEffect(() => {
    if (on && status === "online") send({ t: "audio-start" });
  }, [on, status]);

  useEffect(() => {
    if (audioTaken === 0) return;
    setOn(false);
    setNote("Otro panel empezó a mandar su micrófono.");
  }, [audioTaken]);

  const hint = on
    ? "Las escenas y cámaras reaccionan a lo que escucha esta compu. Las pantallas no piden permiso."
    : remoteAudio
    ? "Otro panel está mandando su micrófono."
    : "Ahora cada pantalla escucha con su propio micrófono.";

  return (
    <div class="audio-source">
      <button
        aria-pressed={on}
        onClick={() => {
          setNote(null);
          setOn(!on);
        }}
      >
        Usar el micrófono de esta compu
      </button>
      {on && (
        <span class="audio-meter" aria-hidden="true">
          <span ref={meter} />
        </span>
      )}
      <p class={`panel-note ${note ? "fault" : ""}`} role="status">
        {note ?? hint}
      </p>
    </div>
  );
}
