import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  environments: {
    client: {
      build: {
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [{ name: "three-core", test: /three[\\/]build[\\/]three\.core\.js$/ }],
            },
          },
        },
      },
    },
  },

  plugins: [
    devtools(),
    // Each app gets its own debugger port so both can run together under `pnpm dev`.
    cloudflare({ viteEnvironment: { name: "ssr" }, inspectorPort: 9229 }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
