import { defineConfig } from "tsdown";
import { wasm } from "@rollup/plugin-wasm";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    "jsx-runtime": "./src/jsx-runtime.ts",
    "jsx-dev-runtime": "./src/jsx-dev-runtime.ts",
    server: "./src/server/index.ts",
  },
  outDir: "./dist",
  minify: true,
  sourcemap: true,
  target: "es2022",
  format: "esm",
  dts: true,
  clean: true,
  // Explicitly target browser to avoid bundling Node.js built-ins
  platform: "browser",
  plugins: [wasm({ maxFileSize: 10000000 })],
  // Ensure Node.js modules are excluded from the bundle
  external: ["node:module", "fs", "path"],
});
