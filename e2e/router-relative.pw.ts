import { test, expect } from '@playwright/test';

test('router demo: relative href resolves against current location', async ({ page }) => {
  await page.goto('/users/42');

  await expect(page.getByTestId('user-title')).toHaveText('User 42');
  await expect(page.getByTestId('user-tab')).toHaveText('tab: (none)');

  await page.getByTestId('link-relative-search').click();

  // Should stay on same path but update search
  await expect(page.getByTestId('user-title')).toHaveText('User 42');
  await expect(page.getByTestId('user-tab')).toHaveText('tab: info');
});
