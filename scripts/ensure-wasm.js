#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const wasmPath = path.join(__dirname, '..', 'dist', 'vsignal.wasm');
if (!fs.existsSync(wasmPath)) {
  console.error('\nERROR: dist/vsignal.wasm not found.');
  console.error('Run `bun run build:wasm` or ensure CI builds the wasm before publishing.');
  process.exit(1);
}
console.log('OK: wasm found:', wasmPath);
