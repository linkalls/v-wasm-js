import { defineConfig } from "tsdown";
import { wasm } from "@rollup/plugin-wasm";

export default defineConfig({
  entry: ["./src/index.ts", "./src/jsx-runtime.ts", "./src/jsx-dev-runtime.ts"],
  outDir: "./dist",
  minify: true,
  sourcemap: true,
  target: "es2022",
  format: "esm",
  dts: true,
  // Don't clean to preserve WASM file (build:wasm runs first)
  clean: true,
  plugins: [
    // Inline WASM as base64 (handles files up to 10MB)
    wasm({ maxFileSize: 10000000 }),
  ],
});
