import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:3002/users/42';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', (msg) => console.log('console:', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('pageerror:', err.message, '\n', err.stack));

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2000);

console.log('content snippet:', (await page.content()).slice(0, 300));

await browser.close();
