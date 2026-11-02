import fs from "node:fs";
import type { Server } from "node:http";
import path from "node:path";
import type { Connect, Plugin } from "vite";
import { HUB_PATH, MEDIA_PATH } from "../shared/protocol";
import { createHub } from "./hub";
import { isVideoFile, mediaHandler } from "./media";

function listVideos(dir: string, prefix: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .filter(isVideoFile)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((file) => `${prefix}/${encodeURIComponent(file)}`);
  } catch {
    return [];
  }
}

// Monta el hub en el mismo servidor HTTP de Vite, así `pnpm dev` levanta todo
// en un solo puerto y los clientes se conectan a su propio origen.
function attach(
  server: { httpServer: unknown; middlewares: Connect.Server; config: { root: string } },
  videosDir: string
) {
  const httpServer = server.httpServer as Server | null;
  if (!httpServer) return;
  // Fuera de dist: lo subido no se pierde al volver a compilar.
  const mediaDir = path.resolve(server.config.root, "media");
  const hub = createHub(() => [
    ...listVideos(videosDir, "/videos"),
    ...listVideos(mediaDir, MEDIA_PATH),
  ]);

  server.middlewares.use(MEDIA_PATH, mediaHandler(mediaDir, hub.refreshVideos));
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
      attach(server, path.join(server.config.publicDir, "videos"));
    },
    configurePreviewServer(server) {
      const { root, build } = server.config;
      attach(server, path.resolve(root, build.outDir, "videos"));
    },
  };
}
