import { chromium, expect } from 'playwright';

const url = process.argv[2] ?? 'https://linkalls.github.io/vitrio-playground/';

const browser = await chromium.launch();
const page = await browser.newPage();

const errors: string[] = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto(url, { waitUntil: 'load' });

// switch to Router example
await page.selectOption('#example', { label: 'Router (TSX)' });
await page.waitForTimeout(1200);

// The iframe preview should show Home
const frameEl = await page.locator('#frame').elementHandle();
if (!frameEl) throw new Error('iframe not found');
const frame = await frameEl.contentFrame();
if (!frame) throw new Error('contentFrame not available');

await frame.waitForSelector('text=Home', { timeout: 5000 });

// click go
await frame.click('text=go');
await frame.waitForSelector('text=User 42', { timeout: 5000 });

if (errors.length) {
  console.error('ERRORS:', errors.join('\n---\n'));
  process.exit(1);
}

console.log('OK: router example works (Home -> User 42)');
await browser.close();
