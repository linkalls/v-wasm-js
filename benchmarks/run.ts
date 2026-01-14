import { chromium } from 'playwright';
import { stat, readdir } from 'fs/promises';

const VITRIO_PORT = 4001;
const SOLID_PORT = 4002;
const REACT_PORT = 4003;

// Serve Vitrio
const serverVitrio = Bun.serve({
  port: VITRIO_PORT,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const filepath = `benchmarks/vitrio-app${path}`;
    const file = Bun.file(filepath);
    return new Response(file);
  },
});

// Serve Solid
const serverSolid = Bun.serve({
  port: SOLID_PORT,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const filepath = `benchmarks/solid-app/dist${path}`;
    const file = Bun.file(filepath);
    return new Response(file);
  },
});

// Serve React
const serverReact = Bun.serve({
  port: REACT_PORT,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const filepath = `benchmarks/react-app/dist${path}`;
    const file = Bun.file(filepath);
    return new Response(file);
  },
});

console.log(`Servers running: Vitrio(${VITRIO_PORT}), Solid(${SOLID_PORT}), React(${REACT_PORT})`);

async function getFileSize(path: string) {
    try {
        const s = await stat(path);
        return s.size;
    } catch {
        return 0;
    }
}

async function runBenchmark() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const results = {
    vitrio: { load: 0, interact: 0, size: 0 },
    solid: { load: 0, interact: 0, size: 0 },
    react: { load: 0, interact: 0, size: 0 },
  };

  // Measure Bundle Size
  results.vitrio.size = await getFileSize('benchmarks/vitrio-app/dist/main.js');

  try {
      const files = await readdir('benchmarks/solid-app/dist/assets');
      const jsFile = files.find(f => f.endsWith('.js'));
      if (jsFile) {
          results.solid.size = await getFileSize(`benchmarks/solid-app/dist/assets/${jsFile}`);
      }
  } catch (e) {
      console.error("Error checking solid assets", e);
  }

  try {
      const files = await readdir('benchmarks/react-app/dist/assets');
      const jsFile = files.find(f => f.endsWith('.js'));
      if (jsFile) {
          results.react.size = await getFileSize(`benchmarks/react-app/dist/assets/${jsFile}`);
      }
  } catch (e) {
      console.error("Error checking react assets", e);
  }

  // Define benchmark function
  async function benchApp(name: string, url: string, target: 'vitrio' | 'solid' | 'react') {
      console.log(`Benchmarking ${name}...`);

      // Load Time (Average of 5)
      let totalLoad = 0;
      for(let i=0; i<5; i++) {
          const start = performance.now();
          await page.goto(url);
          // Wait for #counter to be visible
          await page.waitForSelector('#counter');
          const end = performance.now();
          totalLoad += (end - start);
      }
      results[target].load = totalLoad / 5;

      // Interaction Time (Click 100 times)
      await page.goto(url);
      await page.waitForSelector('#counter');
      // Find the button with + text.
      // Vitrio: <button>+<button>
      // Solid: <button>+</button>
      const btn = page.locator('button', { hasText: '+' }).first();

      const startInteract = performance.now();
      for(let i=0; i<100; i++) {
          await btn.click();
      }
      const endInteract = performance.now();
      results[target].interact = endInteract - startInteract;

      // Verify count
      const count = await page.locator('#counter').textContent();
      console.log(`${name} final count: ${count}`);
  }

  await benchApp('Vitrio', `http://localhost:${VITRIO_PORT}`, 'vitrio');
  await benchApp('Solid', `http://localhost:${SOLID_PORT}`, 'solid');
  await benchApp('React', `http://localhost:${REACT_PORT}`, 'react');

  console.log('\nResults:');
  console.table(results);

  // Save to markdown
  const md = `
# Benchmark Results

| Metric | Vitrio | SolidJS | React |
|--------|--------|---------|-------|
| Bundle Size (bytes) | ${results.vitrio.size} | ${results.solid.size} | ${results.react.size} |
| Avg Load Time (ms) | ${results.vitrio.load.toFixed(2)} | ${results.solid.load.toFixed(2)} | ${results.react.load.toFixed(2)} |
| Interaction (100 clicks) (ms) | ${results.vitrio.interact.toFixed(2)} | ${results.solid.interact.toFixed(2)} | ${results.react.interact.toFixed(2)} |

*Run on ${new Date().toISOString()}*
`;
  await Bun.write('benchmarks/results.md', md);

  await browser.close();
  serverVitrio.stop();
  serverSolid.stop();
  serverReact.stop();
  process.exit(0);
}

runBenchmark();