
import { wasmBase64 } from '../src/generated-wasm';
import { join } from 'path';

async function check() {
  console.log("Checking WASM initialization...");
  try {
    let bytes: Uint8Array;
    if (wasmBase64) {
        bytes = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));
    } else {
        console.log("wasmBase64 is empty, reading from dist/vsignal.wasm");
        const path = join(import.meta.dir, '../dist/vsignal.wasm');
        const buffer = await Bun.file(path).arrayBuffer();
        bytes = new Uint8Array(buffer);
    }

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
    console.log("Initial memory size:", exports.memory.buffer.byteLength);

    // Smart Grow Logic Verification
    const GRAPH_SIZE = 1024 * 1024;
    const SAFETY_MARGIN = 1024 * 1024;
    const REQUIRED_BYTES = GRAPH_SIZE + SAFETY_MARGIN;
    const PAGE_SIZE = 65536;

    const currentBytes = exports.memory.buffer.byteLength;
    const neededPages = Math.ceil((REQUIRED_BYTES - currentBytes) / PAGE_SIZE);

    console.log(`Smart Grow Check: Current=${currentBytes}, Required=${REQUIRED_BYTES}, NeededPages=${neededPages}`);

    if (neededPages > 0) {
        console.log(`Growing memory by ${neededPages} pages...`);
        try {
            exports.memory.grow(neededPages);
            console.log("New memory size:", exports.memory.buffer.byteLength);
        } catch (e) {
            console.log("Failed to grow memory:", e);
        }
    } else {
        console.log("Memory is sufficient. No growth needed.");
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
