const fs = require('fs');

async function run() {
    const wasmBuffer = fs.readFileSync('src/luna_v_test/app.wasm');
    const importObject = {
        env: {
            __panic_abort: () => { throw new Error("Panic"); },
            __writeln: () => {}
        }
    };

    const { instance } = await WebAssembly.instantiate(wasmBuffer, importObject);
    const exports = instance.exports;
    const memory = exports.memory;

    console.log("Initial count check...");
    if (exports.get_count() !== 0) throw new Error("Count should be 0");

    console.log("Incrementing...");
    exports.increment();
    if (exports.get_count() !== 1) throw new Error("Count should be 1");

    console.log("Checking HTML string generation...");
    const ptr = exports.get_html();
    const len = exports.get_html_len();

    console.log(`Ptr: ${ptr}, Len: ${len}`);

    const bytes = new Uint8Array(memory.buffer, ptr, len);
    const html = new TextDecoder('utf-8').decode(bytes);

    console.log("Generated HTML:", html);
    if (!html.includes('Count: 1+')) {
        throw new Error("HTML does not contain expected string");
    }

    console.log("Verification success!");
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
