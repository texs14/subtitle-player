import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: [],
  },
  build: {
    // чтобы rollup корректно обрабатывал CJS + ESM
    commonjsOptions: { transformMixedEsModules: true },
  },
  define: { global: "window" },
  worker: { format: "es" }, // гарантируем ES‑workers }
});
