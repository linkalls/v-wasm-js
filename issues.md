# Current Issues

## WASM Runtime Error
The V-compiled WebAssembly binary currently crashes on initialization in the browser environment with:
`RuntimeError: memory access out of bounds`

This occurs when `_start()` or `init_graph()` is called. As a result, the `initWasm` function catches this error and falls back to the pure JavaScript implementation. The WASM optimization is effectively disabled in the current build.

## V Compiler Panic with `-os browser`
Compiling with `v -os browser -b wasm ...` currently causes a compiler panic:
`V panic: called function eprintln does not exist`

This appears to be an issue in the V compiler (v0.5.0) where `eprintln` is not correctly handled for the browser target. The current binary was built using `-d no_stdio` as a workaround, but `package.json` retains `-os browser` for correctness when the compiler issue is resolved.
