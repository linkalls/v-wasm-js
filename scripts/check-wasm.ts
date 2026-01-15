
import { wasmBase64 } from '../src/generated-wasm';

async function check() {
  console.log("Checking WASM initialization...");
  try {
    const bytes = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));

    const imports = {
      wasi_snapshot_preview1: {
        fd_write: (fd: number, iovs: number, iovs_len: number, nwritten: number) => {
            console.log("fd_write called", fd);
            return 0;
        },
        proc_exit: (code: number) => {
            console.log("proc_exit called", code);
        },
      }
    };

    const result = await WebAssembly.instantiate(bytes, imports);
    const exports = result.instance.exports as any;

    console.log("WASM instantiated.");
    console.log("Exports:", Object.keys(exports));
    console.log("Initial memory size:", exports.memory.buffer.byteLength);

    // Try growing memory
    console.log("Growing memory by 200 pages...");
    try {
        exports.memory.grow(200);
        console.log("New memory size:", exports.memory.buffer.byteLength);
    } catch (e) {
        console.log("Failed to grow memory:", e);
    }

    if (exports._start) {
        console.log("Calling _start...");
        exports._start();
        console.log("_start completed.");
    }

    if (exports.init_graph) {
        console.log("Calling init_graph...");
        const g = exports.init_graph();
        console.log("init_graph returned:", g);
    }

    console.log("SUCCESS");

  } catch (e) {
    console.error("FAILED:", e);
    process.exit(1);
  }
}

check();
