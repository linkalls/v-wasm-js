import http from 'http';
import path from 'path';
import fs from 'fs';
import { performance } from 'perf_hooks';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const PORT = 4010;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vitrioDir = path.join(__dirname, 'vitrio-app');

function serveStatic(dir, port) {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${port}`);
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
      const tryPaths = [
        path.join(dir, 'dist', pathname),
        path.join(dir, pathname),
        path.join(dir, 'dist', pathname.replace(/^\//, '')),
      ];
      let found = null;
      for (const p of tryPaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          found = p;
          break;
        }
      }
      if (!found) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(found).toLowerCase();
      const types = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.wasm': 'application/wasm',
        '.json': 'application/json',
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(found).pipe(res);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

async function main() {
  const server = await serveStatic(vitrioDir, PORT);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const url = `http://localhost:${PORT}`;

  async function gotoAndHydrate() {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#counter', { timeout: 30000 });
    await page.waitForFunction(() => globalThis.__vitrioHydrated === true, { timeout: 30000 });
  }

  // load benchmark (avg of 5)
  let totalLoad = 0;
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    await gotoAndHydrate();
    totalLoad += performance.now() - t0;
  }
  const loadMs = totalLoad / 5;

  // interaction 100 clicks
  await gotoAndHydrate();
  const tI0 = performance.now();
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('+'));
    for (let i = 0; i < 100; i++) btn?.click();
  });
  const interactMs = performance.now() - tI0;

  // list update (50 add, 25 remove)
  await gotoAndHydrate();
  const tL0 = performance.now();
  await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="todo"]');
    const addBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Add');
    if (input && addBtn) {
      for (let i = 0; i < 50; i++) {
        input.value = `Todo item ${i}`;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        addBtn.click();
      }
      const removeButtons = Array.from(document.querySelectorAll('button')).filter((b) => b.textContent === '×');
      for (let i = 0; i < Math.min(25, removeButtons.length); i++) removeButtons[i].click();
    }
  });
  const listMs = performance.now() - tL0;

  // propagate-heavy workload (bench hook)
  await gotoAndHydrate();
  // warm-up
  await page.evaluate(() => globalThis.__bench?.bumpCount?.(100));
  const tP0 = performance.now();
  await page.evaluate(() => globalThis.__bench?.bumpCount?.(5000));
  const propagateMs = performance.now() - tP0;

  const size = fs.existsSync(path.join(vitrioDir, 'dist', 'main.js')) ? fs.statSync(path.join(vitrioDir, 'dist', 'main.js')).size : 0;

  console.log(JSON.stringify({ loadMs, interactMs, listMs, propagateMs, sizeBytes: size, at: new Date().toISOString() }, null, 2));

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
