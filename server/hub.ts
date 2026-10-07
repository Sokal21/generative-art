import type { IncomingMessage } from "node:http";
import os from "node:os";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import {
  ClientMessage,
  DEFAULT_PARAMS,
  EffectParams,
  HubState,
  PARAM_KEYS,
  PARAMS,
  Role,
  SCENES,
  ScreenContent,
  ServerMessage,
  ShaderId,
  SHADERS,
  Viewer,
} from "../shared/protocol";

const HEARTBEAT_MS = 5000;
const CLOSE_REPLACED = 4001;

interface Client {
  ws: WebSocket;
  role: Role;
  id: string;
  session: number;
  alive: boolean;
}

interface ScreenRecord {
  content: ScreenContent;
  params: EffectParams;
  error: string | null;
  client?: Client;
}

interface SourceRecord {
  shader: ShaderId;
  client?: Client;
}

const isShader = (value: unknown): value is ShaderId =>
  typeof value === "string" && value in SHADERS;

const isId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 64;

function parseContent(value: any): ScreenContent | null {
  switch (value?.kind) {
    case "idle":
    case "blank":
      return { kind: value.kind };
    case "video":
      return typeof value.url === "string" && isShader(value.shader)
        ? { kind: "video", url: value.url, shader: value.shader }
        : null;
    case "scene":
      return typeof value.scene === "string" && value.scene in SCENES
        ? { kind: "scene", scene: value.scene }
        : null;
    case "stream":
      return isId(value.source) ? { kind: "stream", source: value.source } : null;
    default:
      return null;
  }
}

function parseParams(value: any): Partial<EffectParams> {
  const params: Partial<EffectParams> = {};
  for (const key of PARAM_KEYS) {
    const n = value?.[key];
    if (typeof n === "number" && Number.isFinite(n)) {
      params[key] = Math.min(PARAMS[key].max, Math.max(PARAMS[key].min, n));
    }
  }
  return params;
}

function lanAddresses(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => net!.address);
}

/**
 * Hub central: guarda qué tiene que mostrar cada pantalla, se lo reenvía cada
 * vez que se reconecta, y retransmite la señalización WebRTC entre cámaras y
 * pantallas. El video en vivo va directo entre ellas; todo lo demás pasa por acá.
 */
export function createHub(listVideos: () => string[]) {
  const wss = new WebSocketServer({ noServer: true });
  const screens = new Map<string, ScreenRecord>();
  const sources = new Map<string, SourceRecord>();
  const controls = new Set<Client>();
  let videos = listVideos();
  let sessions = 0;

  const send = (client: Client | undefined, message: ServerMessage) => {
    if (client?.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  };

  const snapshot = (): HubState => ({
    screens: [...screens].map(([id, s]) => ({
      id,
      online: !!s.client,
      content: s.content,
      params: s.params,
      error: s.error,
    })),
    sources: [...sources].map(([id, s]) => ({ id, online: !!s.client, shader: s.shader })),
    videos,
    addresses: lanAddresses(),
  });

  const publishState = () => {
    const message: ServerMessage = { t: "state", state: snapshot() };
    controls.forEach((control) => send(control, message));
  };

  const publishViewers = () => {
    for (const [id, source] of sources) {
      const viewers: Viewer[] = [];
      for (const [screenId, screen] of screens) {
        if (screen.client && screen.content.kind === "stream" && screen.content.source === id) {
          viewers.push({ id: screenId, session: screen.client.session });
        }
      }
      send(source.client, { t: "viewers", viewers });
    }
  };

  const pushScreen = (screen: ScreenRecord) =>
    send(screen.client, { t: "screen", content: screen.content, params: screen.params, videos });

  const targets = (ids: unknown): ScreenRecord[] =>
    Array.isArray(ids) ? ids.flatMap((id) => screens.get(id) ?? []) : [];

  const register = (ws: WebSocket, hello: Extract<ClientMessage, { t: "hello" }>): Client | null => {
    if (hello.role === "control") {
      const client: Client = { ws, role: "control", id: "", session: ++sessions, alive: true };
      controls.add(client);
      videos = listVideos();
      send(client, { t: "state", state: snapshot() });
      return client;
    }
    if (!isId(hello.id)) return null;

    const client: Client = { ws, role: hello.role, id: hello.id, session: ++sessions, alive: true };
    const records: Map<string, ScreenRecord | SourceRecord> = hello.role === "screen" ? screens : sources;

    // Mismo nombre abierto dos veces: gana la última, la anterior se retira.
    const previous = records.get(hello.id)?.client;
    if (previous) {
      send(previous, { t: "replaced" });
      previous.ws.close(CLOSE_REPLACED);
    }

    if (hello.role === "screen") {
      const screen: ScreenRecord = screens.get(hello.id) ?? {
        content: parseContent(hello.content) ?? { kind: "idle" },
        params: { ...DEFAULT_PARAMS, ...parseParams(hello.params) },
        error: null,
      };
      screen.client = client;
      screen.error = null;
      screens.set(hello.id, screen);
      pushScreen(screen);
    } else {
      const source: SourceRecord = sources.get(hello.id) ?? {
        shader: isShader(hello.shader) ? hello.shader : "red_hue_with_waves",
      };
      source.client = client;
      sources.set(hello.id, source);
      send(client, { t: "source", shader: source.shader });
    }
    publishState();
    publishViewers();
    return client;
  };

  const unregister = (client: Client) => {
    if (client.role === "control") {
      controls.delete(client);
      return;
    }
    const record = (client.role === "screen" ? screens : sources).get(client.id);
    if (record?.client !== client) return;
    record.client = undefined;
    publishState();
    publishViewers();
  };

  const handle = (client: Client, message: ClientMessage) => {
    switch (message.t) {
      case "set-content": {
        const content = parseContent(message.content);
        if (!content) return;
        for (const screen of targets(message.screens)) {
          screen.content = content;
          screen.error = null;
          pushScreen(screen);
        }
        publishState();
        publishViewers();
        return;
      }
      case "set-shader": {
        if (!isShader(message.shader)) return;
        for (const screen of targets(message.screens)) {
          if (screen.content.kind !== "video") continue;
          screen.content = { ...screen.content, shader: message.shader };
          pushScreen(screen);
        }
        publishState();
        return;
      }
      case "set-params": {
        const params = parseParams(message.params);
        for (const screen of targets(message.screens)) {
          screen.params = { ...screen.params, ...params };
          pushScreen(screen);
        }
        publishState();
        return;
      }
      case "set-source-shader": {
        const source = sources.get(message.source);
        if (!source || !isShader(message.shader)) return;
        source.shader = message.shader;
        send(source.client, { t: "source", shader: source.shader });
        publishState();
        return;
      }
      case "identify":
        targets(message.screens).forEach((screen) => send(screen.client, { t: "identify" }));
        return;
      case "forget": {
        const records: Map<string, ScreenRecord | SourceRecord> =
          message.role === "screen" ? screens : sources;
        if (records.get(message.id)?.client) return;
        records.delete(message.id);
        publishState();
        return;
      }
      case "refresh-videos":
        videos = listVideos();
        publishState();
        return;
      case "report": {
        const screen = client.role === "screen" ? screens.get(client.id) : undefined;
        if (!screen) return;
        screen.error = typeof message.error === "string" ? message.error : null;
        publishState();
        return;
      }
      case "signal": {
        // Las cámaras solo hablan con pantallas y viceversa.
        const peer =
          client.role === "cam" ? screens.get(message.to)?.client : sources.get(message.to)?.client;
        send(peer, { t: "signal", from: client.id, data: message.data });
        return;
      }
    }
  };

  wss.on("connection", (ws) => {
    let client: Client | null = null;

    ws.on("message", (raw) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!client) {
        if (message?.t === "hello") client = register(ws, message);
        if (!client) ws.close();
        return;
      }
      client.alive = true;
      try {
        handle(client, message);
      } catch (error) {
        console.error("[hub] mensaje inválido", message, error);
      }
    });

    ws.on("close", () => client && unregister(client));
    ws.on("error", () => ws.terminate());
  });

  // Un cable desenchufado no dispara "close": lo detectamos por silencio.
  const heartbeat = setInterval(() => {
    const clients = [
      ...controls,
      ...[...screens.values(), ...sources.values()].flatMap((record) => record.client ?? []),
    ];
    for (const client of clients) {
      if (!client.alive) {
        client.ws.terminate();
        continue;
      }
      client.alive = false;
      send(client, { t: "ping" });
    }
  }, HEARTBEAT_MS);

  return {
    handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
      wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
    },
    close() {
      clearInterval(heartbeat);
      wss.clients.forEach((ws) => ws.terminate());
      wss.close();
    },
  };
}
