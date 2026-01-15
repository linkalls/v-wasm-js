import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

await Bun.build({
  entrypoints: [join(rootDir, 'examples/counter/main.tsx')],
  outdir: join(__dirname, 'dist'),
  target: 'browser',
  minify: true,
  splitting: true, // Enable splitting to test lazy loading of WASM
});
console.log("Vitrio build complete.");
