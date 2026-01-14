// Bun debug script: tries several chromium launch modes and prints detailed errors
import { existsSync } from 'fs';

(async () => {
  try {
    process.env.DEBUG = 'pw:browser*';
    console.log('DEBUG=', process.env.DEBUG);
    const pw = await import('playwright');
    const { chromium } = pw as any;

    console.log('\n=== Attempt 1: default launch ===');
    try {
      const b1 = await chromium.launch();
      console.log('Attempt 1: launched');
      await b1.close();
      console.log('Attempt 1: closed');
    } catch (e1) {
      console.error('Attempt 1 error:');
      console.error(e1 && (e1.stack || e1));
    }

    console.log('\n=== Attempt 2: launch with args (--no-sandbox) ===');
    try {
      const b2 = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
      console.log('Attempt 2: launched');
      await b2.close();
      console.log('Attempt 2: closed');
    } catch (e2) {
      console.error('Attempt 2 error:');
      console.error(e2 && (e2.stack || e2));
    }

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    console.log('\nChecking for system Chrome at', chromePath, 'exists=', existsSync(chromePath));
    if (existsSync(chromePath)) {
      console.log('\n=== Attempt 3: launch with executablePath -> system Chrome ===');
      try {
        const b3 = await chromium.launch({ executablePath: chromePath, args: ['--no-sandbox'] });
        console.log('Attempt 3: launched');
        await b3.close();
        console.log('Attempt 3: closed');
      } catch (e3) {
        console.error('Attempt 3 error:');
        console.error(e3 && (e3.stack || e3));
      }
    } else {
      console.log('System Chrome not found at expected path; skipping Attempt 3');
    }

    console.log('\nDone.');
    process.exit(0);
  } catch (err) {
    console.error('Top-level error:');
    console.error(err && (err.stack || err));
    // Print more properties if available
    try { console.error(JSON.stringify(err, Object.getOwnPropertyNames(err), 2)); } catch (_) {}
    process.exit(1);
  }
})();
