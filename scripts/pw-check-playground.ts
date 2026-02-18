import { chromium } from 'playwright';

const url = process.argv[2] ?? 'https://linkalls.github.io/vitrio-playground/';

const browser = await chromium.launch();
const page = await browser.newPage();

const errors: string[] = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2000);

// If the iframe renders, it should exist.
const frame = await page.locator('#frame').elementHandle();
if (!frame) {
  errors.push('iframe #frame not found');
}

if (errors.length) {
  console.error('ERRORS:', errors.join('\n---\n'));
  process.exit(1);
}

console.log('OK: no console/page errors');
await browser.close();
