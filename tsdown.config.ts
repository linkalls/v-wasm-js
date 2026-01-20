import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/jsx-runtime.ts", "./src/jsx-dev-runtime.ts"],
  outDir: "./dist",
  minify: true,
  sourcemap: true,
  target: "es2022",
  format: "esm",
  dts: true,
  // Don't clean to preserve WASM file (build:wasm runs first)
  clean: false,
});
