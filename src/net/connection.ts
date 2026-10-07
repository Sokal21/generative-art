import { ClientMessage, Hello, HUB_PATH, ServerMessage } from "../../shared/protocol";

export type Status = "connecting" | "online" | "offline" | "replaced";

type MessageOf<T extends ServerMessage["t"]> = Extract<ServerMessage, { t: T }>;

// El hub manda un ping cada 5 s; si pasa esto sin noticias, la red se cayó.
const SILENCE_MS = 12000;
const MAX_RETRY_MS = 5000;

/**
 * Conexión al hub que se reconecta sola. `hello` se vuelve a evaluar en cada
 * intento para presentarse con el estado actual del cliente.
 */
export class Connection {
  status: Status = "connecting";

  private ws?: WebSocket;
  private retries = 0;
  private watchdog?: number;
  private handlers = new Map<string, Set<(message: any) => void>>();
  private statusListeners = new Set<(status: Status) => void>();

  constructor(private readonly hello: () => Hello) {
    this.open();
  }

  on<T extends ServerMessage["t"]>(type: T, handler: (message: MessageOf<T>) => void): () => void {
    const set = this.handlers.get(type) ?? new Set();
    this.handlers.set(type, set);
    set.add(handler);
    return () => set.delete(handler);
  }

  onStatus(listener: (status: Status) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  send(message: ClientMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  private open() {
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${scheme}://${location.host}${HUB_PATH}`);
    this.ws = ws;

    ws.onopen = () => {
      this.retries = 0;
      this.send(this.hello());
      this.setStatus("online");
      this.armWatchdog();
    };

    ws.onmessage = (event) => {
      this.armWatchdog();
      const message: ServerMessage = JSON.parse(event.data);
      if (message.t === "ping") {
        this.send({ t: "pong" });
      } else if (message.t === "replaced") {
        this.setStatus("replaced");
      }
      this.handlers.get(message.t)?.forEach((handler) => handler(message));
    };

    ws.onclose = () => this.dropped(ws);
  }

  private dropped(ws: WebSocket) {
    if (this.ws !== ws) return;
    this.ws = undefined;
    ws.onopen = ws.onmessage = ws.onclose = null;
    ws.close();
    clearTimeout(this.watchdog);

    // Otra pestaña tomó este nombre: reconectar sería pelearse con ella.
    if (this.status === "replaced") return;

    this.setStatus("offline");
    const delay = Math.min(MAX_RETRY_MS, 500 * 2 ** this.retries++);
    setTimeout(() => this.open(), delay);
  }

  private armWatchdog() {
    clearTimeout(this.watchdog);
    const ws = this.ws;
    this.watchdog = window.setTimeout(() => ws && this.dropped(ws), SILENCE_MS);
  }

  private setStatus(status: Status) {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}
