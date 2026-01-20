// Type declarations for WebAssembly modules
declare module "*.wasm" {
  const initWasm: (
    imports?: WebAssembly.Imports,
  ) => Promise<WebAssembly.Instance>;
  export default initWasm;
}
