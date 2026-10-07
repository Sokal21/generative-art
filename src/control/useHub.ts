import { useEffect, useRef, useState } from "preact/hooks";
import { ClientMessage, HubState } from "../../shared/protocol";
import { Connection, Status } from "../net/connection";

export type Send = (message: ClientMessage) => void;

export function useHub() {
  const connection = useRef<Connection>();
  const [state, setState] = useState<HubState | null>(null);
  const [status, setStatus] = useState<Status>("connecting");

  // La conexión se crea y se suscribe en el mismo paso: el hub manda el estado
  // apenas recibe el saludo y no hay que perderse ese primer mensaje.
  useEffect(() => {
    const hub = new Connection(() => ({ t: "hello", role: "control" }));
    hub.on("state", (message) => setState(message.state));
    hub.onStatus(setStatus);
    connection.current = hub;
  }, []);

  const send = useRef<Send>((message) => void connection.current?.send(message));
  return { state, status, send: send.current };
}
