import fs from "node:fs";
import type { Server } from "node:http";
import path from "node:path";
import type { Plugin } from "vite";
import { HUB_PATH } from "../shared/protocol";
import { createHub } from "./hub";

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v", ".ogv"]);

function listVideos(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => VIDEO_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((file) => `/videos/${encodeURIComponent(file)}`);
  } catch {
    return [];
  }
}

// Monta el hub en el mismo servidor HTTP de Vite, así `pnpm dev` levanta todo
// en un solo puerto y los clientes se conectan a su propio origen.
function attach(httpServer: Server | null, videosDir: string) {
  if (!httpServer) return;
  const hub = createHub(() => listVideos(videosDir));

  httpServer.on("upgrade", (request, socket, head) => {
    // El resto de los upgrades son del HMR de Vite.
    if (new URL(request.url ?? "", "http://hub").pathname === HUB_PATH) {
      hub.handleUpgrade(request, socket, head);
    }
  });
  httpServer.on("close", () => hub.close());
}

export function hubPlugin(): Plugin {
  return {
    name: "generative-art-hub",
    configureServer(server) {
      attach(server.httpServer as Server | null, path.join(server.config.publicDir, "videos"));
    },
    configurePreviewServer(server) {
      const { root, build } = server.config;
      attach(server.httpServer as Server, path.resolve(root, build.outDir, "videos"));
    },
  };
}
