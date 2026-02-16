import { test, expect } from '@playwright/test';

test('router demo: navigate + loader + action invalidates and refreshes loader data', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('link-user-42').click();

  await expect(page.getByTestId('users-layout').first()).toHaveText('Users layout');
  await expect(page.getByTestId('user-title')).toHaveText('User 42');
  await expect(page.getByTestId('user-tab')).toHaveText('tab: (none)');
  await expect(page.getByTestId('user-count')).toHaveText('loader count: 0');

  await page.getByTestId('btn-inc').click();

  // After action, the route loader cache is invalidated for this instance.
  // Next render should show updated count.
  await expect(page.getByTestId('user-count')).toHaveText('loader count: 1');
});

test('router demo: search param affects loader cache key', async ({ page }) => {
  await page.goto('/users/99?tab=info');

  await expect(page.getByTestId('user-title')).toHaveText('User 99');
  await expect(page.getByTestId('user-tab')).toHaveText('tab: info');
});
