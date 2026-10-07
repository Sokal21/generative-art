import { Signal, Viewer } from "../../shared/protocol";
import { Connection } from "./connection";

// Todo corre en la red local: sin STUN no dependemos de internet.
const RTC_CONFIG: RTCConfiguration = { iceServers: [] };
const MAX_BITRATE = 12_000_000;
const DISCONNECTED_GRACE_MS = 4000;
const RETRY_MS = 1000;

interface Link {
  conn: string;
  pc: RTCPeerConnection;
  // Serializa las operaciones para no aplicar candidatos antes que la descripción.
  queue: Promise<unknown>;
  timer?: number;
}

const newConn = () => Math.random().toString(36).slice(2);

function enqueue(link: Link, task: () => Promise<unknown>) {
  link.queue = link.queue.then(task).catch((error) => console.warn("[rtc]", error));
}

function closeLink(link: Link) {
  clearTimeout(link.timer);
  link.pc.onconnectionstatechange = link.pc.onicecandidate = link.pc.ontrack = null;
  link.pc.close();
}

/** Lado cámara: mantiene una conexión por cada pantalla que el hub le indica. */
export class StreamPublisher {
  private links = new Map<string, Link>();
  private viewers = new Map<string, Viewer>();

  constructor(private readonly connection: Connection, private readonly stream: MediaStream) {
    connection.on("viewers", ({ viewers }) => this.reconcile(viewers));
    connection.on("signal", ({ from, data }) => this.onSignal(from, data));
    stream.getVideoTracks().forEach((track) => (track.contentHint = "motion"));
  }

  private key = (viewer: Viewer) => `${viewer.id}#${viewer.session}`;

  private reconcile(viewers: Viewer[]) {
    const wanted = new Map(viewers.map((viewer) => [this.key(viewer), viewer]));
    for (const [key, link] of this.links) {
      if (!wanted.has(key)) {
        closeLink(link);
        this.links.delete(key);
      }
    }
    this.viewers = wanted;
    for (const viewer of viewers) {
      if (!this.links.has(this.key(viewer))) this.offer(viewer);
    }
  }

  private offer(viewer: Viewer) {
    const key = this.key(viewer);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const link: Link = { conn: newConn(), pc, queue: Promise.resolve() };
    this.links.set(key, link);

    const retry = () => {
      if (this.links.get(key) !== link) return;
      closeLink(link);
      this.links.delete(key);
      link.timer = window.setTimeout(() => {
        if (this.viewers.has(key) && !this.links.has(key)) this.offer(viewer);
      }, RETRY_MS);
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.signal(viewer.id, { kind: "ice", conn: link.conn, candidate: candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      clearTimeout(link.timer);
      if (pc.connectionState === "failed") retry();
      if (pc.connectionState === "disconnected") {
        link.timer = window.setTimeout(retry, DISCONNECTED_GRACE_MS);
      }
    };

    for (const track of this.stream.getTracks()) {
      const sender = pc.addTrack(track, this.stream);
      if (track.kind !== "video") continue;
      const parameters = sender.getParameters();
      parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}];
      parameters.encodings[0].maxBitrate = MAX_BITRATE;
      sender.setParameters(parameters).catch(() => {});
    }

    enqueue(link, async () => {
      await pc.setLocalDescription(await pc.createOffer());
      this.signal(viewer.id, { kind: "offer", conn: link.conn, sdp: pc.localDescription!.sdp });
    });
  }

  private onSignal(from: string, data: Signal) {
    const link = [...this.links].find(([key, l]) => key.startsWith(`${from}#`) && l.conn === data.conn)?.[1];
    if (!link) return;
    if (data.kind === "answer") {
      enqueue(link, () => link.pc.setRemoteDescription({ type: "answer", sdp: data.sdp }));
    } else if (data.kind === "ice") {
      enqueue(link, () => link.pc.addIceCandidate(data.candidate));
    }
  }

  private signal(to: string, data: Signal) {
    this.connection.send({ t: "signal", to, data });
  }
}

/** Lado pantalla: acepta la oferta de la cámara que el hub le asignó. */
export class StreamSubscriber {
  private source: string | null = null;
  private link?: Link;

  constructor(
    private readonly connection: Connection,
    private readonly onStream: (stream: MediaStream | null) => void
  ) {
    connection.on("signal", ({ from, data }) => this.onSignal(from, data));
  }

  /** Cámara de la que se aceptan ofertas; `null` corta lo que haya. */
  watch(source: string | null) {
    if (source === this.source) return;
    this.source = source;
    this.drop();
  }

  private drop() {
    if (!this.link) return;
    closeLink(this.link);
    this.link = undefined;
    this.onStream(null);
  }

  private onSignal(from: string, data: Signal) {
    if (from !== this.source) return;

    if (data.kind === "offer") {
      // Una oferta nueva reemplaza a la anterior (la cámara se reinició o reintenta).
      this.drop();
      const pc = new RTCPeerConnection(RTC_CONFIG);
      const link: Link = { conn: data.conn, pc, queue: Promise.resolve() };
      this.link = link;

      pc.ontrack = ({ streams }) => this.onStream(streams[0] ?? null);
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" && this.link === link) this.drop();
      };
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          this.connection.send({
            t: "signal",
            to: from,
            data: { kind: "ice", conn: link.conn, candidate: candidate.toJSON() },
          });
        }
      };
      enqueue(link, async () => {
        await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
        await pc.setLocalDescription(await pc.createAnswer());
        this.connection.send({
          t: "signal",
          to: from,
          data: { kind: "answer", conn: link.conn, sdp: pc.localDescription!.sdp },
        });
      });
      return;
    }

    const link = this.link;
    if (data.kind === "ice" && link?.conn === data.conn) {
      enqueue(link, () => link.pc.addIceCandidate(data.candidate));
    }
  }
}
