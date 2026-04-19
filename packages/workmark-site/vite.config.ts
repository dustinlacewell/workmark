import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: "/",
  // Highlighting runs at build time via shiki with a top-level await; need
  // a build target that supports TLA.
  build: { target: "es2022" },
  esbuild: { target: "es2022" },
  optimizeDeps: { esbuildOptions: { target: "es2022" } },
  ssgOptions: {
    script: "async",
  },
});
