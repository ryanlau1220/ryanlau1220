import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  server: { port: 3001, strictPort: true },
  plugins: [
    // Each app gets its own debugger port so both can run together under `pnpm dev`.
    cloudflare({ viteEnvironment: { name: "ssr" }, inspectorPort: 9230 }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});
