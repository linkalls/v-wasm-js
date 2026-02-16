import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/*.pw.ts'],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    headless: true,
    trace: 'retain-on-failure',
    baseURL: 'http://127.0.0.1:3002',
  },
  webServer: {
    command: 'PORT=3002 bun run examples/router-demo/serve.ts',
    url: 'http://127.0.0.1:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
