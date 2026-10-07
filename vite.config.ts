import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";
import { hubPlugin } from "./server/vite-plugin";

// Cámara y micrófono solo funcionan fuera de localhost con HTTPS.
// `HTTPS=0 pnpm dev` lo apaga si todo corre en una sola máquina.
const https = process.env.HTTPS !== "0";

export default defineConfig({
  plugins: [hubPlugin(), ...(https ? [basicSsl()] : [])],
  server: { host: true },
  preview: { host: true },
  esbuild: { jsx: "automatic", jsxImportSource: "preact" },
});
