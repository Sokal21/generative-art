import crypto from "node:crypto";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { pipeline } from "node:stream/promises";

// Se sirve .mov como mp4: casi siempre es H.264 adentro y Chrome no acepta
// video/quicktime aunque sepa decodificarlo.
const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/mp4",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
};

export const isVideoFile = (file: string) => path.extname(file).toLowerCase() in CONTENT_TYPES;

function reply(res: ServerResponse, status: number, body: object) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

// Nunca pisa un archivo: las pantallas guardan cada video por su URL.
function freeName(dir: string, wanted: string): string {
  const { name, ext } = path.parse(wanted);
  let candidate = wanted;
  for (let n = 2; fs.existsSync(path.join(dir, candidate)); n++) {
    candidate = `${name} (${n})${ext}`;
  }
  return candidate;
}

async function upload(
  dir: string,
  req: IncomingMessage,
  res: ServerResponse,
  onUploaded: () => void
) {
  // Cualquier web abierta en el navegador podría postear a esta dirección.
  // Con HTTPS Vite usa HTTP/2, donde el host viene en ":authority".
  const origin = req.headers.origin;
  const host = req.headers.host ?? req.headers[":authority"];
  if (origin && new URL(origin).host !== host) {
    return reply(res, 403, { error: "Origen no permitido" });
  }

  const requested = new URL(req.url ?? "", "http://hub").searchParams.get("name") ?? "";
  const name = path.basename(requested.replace(/\\/g, "/")).replace(/^\.+/, "");
  if (!isVideoFile(name)) return reply(res, 415, { error: `${name || "Ese archivo"} no es un video` });

  fs.mkdirSync(dir, { recursive: true });
  const partial = path.join(dir, `.upload-${crypto.randomUUID()}`);
  try {
    await pipeline(req, fs.createWriteStream(partial));
    const final = freeName(dir, name);
    fs.renameSync(partial, path.join(dir, final));
    onUploaded();
    reply(res, 201, { name: final });
  } catch (error) {
    fs.rmSync(partial, { force: true });
    console.error("[media] falló una subida", error);
    if (!res.destroyed) reply(res, 500, { error: "No se pudo guardar" });
  }
}

function serve(dir: string, req: IncomingMessage, res: ServerResponse) {
  let name: string;
  try {
    name = decodeURIComponent(new URL(req.url ?? "", "http://hub").pathname.slice(1));
  } catch {
    return reply(res, 400, { error: "Ruta inválida" });
  }
  const file = path.join(dir, name);
  if (path.basename(name) !== name || !isVideoFile(name) || !fs.existsSync(file)) {
    return reply(res, 404, { error: "No existe" });
  }

  const { size } = fs.statSync(file);
  const headers = {
    "Content-Type": CONTENT_TYPES[path.extname(name).toLowerCase()],
    "Accept-Ranges": "bytes",
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  let start = 0;
  let end = size - 1;
  if (range && (range[1] || range[2])) {
    // "bytes=-500" pide los últimos 500 bytes.
    start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    end = range[1] && range[2] ? Math.min(end, Number(range[2])) : end;
    if (start > end) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` });
      return res.end();
    }
    res.writeHead(206, {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": end - start + 1,
    });
  } else {
    res.writeHead(200, { ...headers, "Content-Length": size });
  }

  if (req.method === "HEAD" || size === 0) return res.end();
  pipeline(fs.createReadStream(file, { start, end }), res).catch(() => {
    // El cliente cortó: un <video> lo hace todo el tiempo al saltar.
  });
}

/** Sube y sirve los videos del panel. El montaje en la ruta le saca el prefijo a `req.url`. */
export function mediaHandler(dir: string, onUploaded: () => void) {
  return (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "POST") return void upload(dir, req, res, onUploaded);
    if (req.method === "GET" || req.method === "HEAD") return serve(dir, req, res);
    reply(res, 405, { error: "Método no permitido" });
  };
}
