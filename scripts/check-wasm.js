#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const wasmPath = path.join(process.cwd(), 'dist', 'vsignal.wasm');

if (!fs.existsSync(wasmPath)) {
  console.error('FAILED: dist/vsignal.wasm not found. Run `npm run build` (and `npm run build:wasm` if needed).');
  process.exit(1);
}

const bytes = fs.readFileSync(wasmPath);
if (!bytes || bytes.length < 8) {
  console.error('FAILED: dist/vsignal.wasm is empty or invalid.');
  process.exit(1);
}

console.log(`SUCCESS: dist/vsignal.wasm found (${bytes.length} bytes)`);
