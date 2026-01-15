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
    if (url.pathname === '/vsignal.wasm') {
        const file = Bun.file('dist/vsignal.wasm');
        return new Response(file, { headers: { 'Content-Type': 'application/wasm' } });
    }
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
  console.log('Launching browser...');
  const browser = await chromium.launch();
  console.log('Browser launched!');
  const page = await browser.newPage();
  console.log('Page created!');

  const results = {
    vitrio: { load: 0, interact: 0, listUpdate: 0, size: 0 },
    solid: { load: 0, interact: 0, listUpdate: 0, size: 0 },
    react: { load: 0, interact: 0, listUpdate: 0, size: 0 },
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
      console.log(`\nBenchmarking ${name}...`);

      // Load Time (Average of 5 navigations)
      let totalLoad = 0;
      for(let i=0; i<5; i++) {
          const start = performance.now();
          await page.goto(url, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('#counter', { timeout: 10000 });
          const end = performance.now();
          totalLoad += (end - start);
      }
      results[target].load = totalLoad / 5;
      console.log(`  Load time: ${results[target].load.toFixed(2)}ms`);

      // Interaction Time (Click 100 times) - Counter increment
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#counter', { timeout: 10000 });

      const startInteract = performance.now();
      await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent?.includes('+'));
          if (btn) {
              for(let i=0; i<100; i++) {
                  (btn as HTMLElement).click();
              }
          }
      });
      const endInteract = performance.now();
      results[target].interact = endInteract - startInteract;
      console.log(`  Interact time: ${results[target].interact.toFixed(2)}ms`);

      // Verify count
      const count = await page.locator('#counter').textContent();
      console.log(`  Final count: ${count}`);

      // List Update Benchmark (Add 50 items + Remove 25)
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#counter', { timeout: 10000 });
      
      const startList = performance.now();
      await page.evaluate(async () => {
          // Find the todo input and add button
          const input = document.querySelector('input[placeholder*="todo"]') as HTMLInputElement;
          const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Add');
          
          if (input && addBtn) {
              // Add 50 items
              for (let i = 0; i < 50; i++) {
                  input.value = `Todo item ${i}`;
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  (addBtn as HTMLElement).click();
              }

              // Allow batching/render to settle
              await new Promise(r => setTimeout(r, 0));
              
              // Remove 25 items (every other one)
              const removeButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent === '×');
              for (let i = 0; i < Math.min(25, removeButtons.length); i++) {
                  (removeButtons[i] as HTMLElement).click();
              }
          }
      });
      const endList = performance.now();
      results[target].listUpdate = endList - startList;
      console.log(`  List update time: ${results[target].listUpdate.toFixed(2)}ms`);

      // Verify list count
      const listItems = await page.locator('li').count();
      console.log(`  Final list items: ${listItems}`);
  }

  await benchApp('Vitrio', `http://localhost:${VITRIO_PORT}`, 'vitrio');
  await benchApp('Solid', `http://localhost:${SOLID_PORT}`, 'solid');
  await benchApp('React', `http://localhost:${REACT_PORT}`, 'react');

  console.log('\n=== Results ===');
  console.table(results);

  // Calculate relative performance
  const vitrioVsSolid = ((results.solid.interact / results.vitrio.interact) * 100 - 100).toFixed(1);
  const vitrioVsReact = ((results.react.interact / results.vitrio.interact) * 100 - 100).toFixed(1);
  const listVitrioVsSolid = results.vitrio.listUpdate > 0 && results.solid.listUpdate > 0 
    ? ((results.solid.listUpdate / results.vitrio.listUpdate) * 100 - 100).toFixed(1) 
    : 'N/A';

  // Save to markdown
  const md = `# Benchmark Results

| Metric | Vitrio (WASM) | SolidJS | React |
|--------|---------------|---------|-------|
| Bundle Size (bytes) | ${results.vitrio.size} | ${results.solid.size} | ${results.react.size} |
| Avg Load Time (ms) | ${results.vitrio.load.toFixed(2)} | ${results.solid.load.toFixed(2)} | ${results.react.load.toFixed(2)} |
| Interaction (100 clicks) (ms) | ${results.vitrio.interact.toFixed(2)} | ${results.solid.interact.toFixed(2)} | ${results.react.interact.toFixed(2)} |
| List Update (50 add, 25 remove) (ms) | ${results.vitrio.listUpdate.toFixed(2)} | ${results.solid.listUpdate.toFixed(2)} | ${results.react.listUpdate.toFixed(2)} |

## Performance Comparison

- **Counter (100 clicks)**: Vitrio is ${vitrioVsSolid}% ${Number(vitrioVsSolid) > 0 ? 'faster' : 'slower'} than Solid, ${vitrioVsReact}% ${Number(vitrioVsReact) > 0 ? 'faster' : 'slower'} than React
- **List Updates**: Vitrio is ${listVitrioVsSolid}% ${Number(listVitrioVsSolid) > 0 ? 'faster' : 'slower'} than Solid

*Run on ${new Date().toISOString()}*
`;
  await Bun.write('benchmarks/results.md', md);
  console.log('\nResults saved to benchmarks/results.md');

  await browser.close();
  serverVitrio.stop();
  serverSolid.stop();
  serverReact.stop();
  process.exit(0);
}

runBenchmark().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
