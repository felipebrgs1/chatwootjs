import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/main.ts",
      name: "ChatwootWidget",
      formats: ["iife"],
      fileName: () => "widget.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: "esbuild",
    target: "es2020",
  },
});
