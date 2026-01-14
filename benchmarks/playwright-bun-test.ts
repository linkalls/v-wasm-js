// Minimal Bun-friendly Playwright test
(async () => {
  try {
    const pw = await import('playwright');
    const { chromium } = pw as any;
    console.log('Attempting to launch Chromium...');
    const browser = await chromium.launch();
    console.log('Chromium launched');
    await browser.close();
    console.log('Chromium closed — success');
    process.exit(0);
  } catch (err) {
    console.error('Playwright launch error:');
    console.error(err);
    process.exit(1);
  }
})();
