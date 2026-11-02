import { useEffect, useRef, useState } from "preact/hooks";
import { ClientMessage, HubState } from "../../shared/protocol";
import { Connection, Status } from "../net/connection";

export type Send = (message: ClientMessage) => void;

export function useHub() {
  const connection = useRef<Connection>();
  const [state, setState] = useState<HubState | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  // Cuenta las veces que otro panel le sacó el micrófono a este.
  const [audioTaken, setAudioTaken] = useState(0);

  // La conexión se crea y se suscribe en el mismo paso: el hub manda el estado
  // apenas recibe el saludo y no hay que perderse ese primer mensaje.
  useEffect(() => {
    const hub = new Connection(() => ({ t: "hello", role: "control" }));
    hub.on("state", (message) => setState(message.state));
    hub.on("audio-taken", () => setAudioTaken((count) => count + 1));
    hub.onStatus(setStatus);
    connection.current = hub;
  }, []);

  const send = useRef<Send>((message) => void connection.current?.send(message));
  return { state, status, audioTaken, send: send.current };
}
