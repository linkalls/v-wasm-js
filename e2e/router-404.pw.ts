import { test, expect } from '@playwright/test';

test('router demo: 404 only shows when no route matches', async ({ page }) => {
  await page.goto('/nope');
  await expect(page.getByTestId('notfound-title')).toHaveText('404');

  await page.goto('/users/42');
  await expect(page.getByTestId('user-title')).toHaveText('User 42');
  await expect(page.getByTestId('notfound-title')).toHaveCount(0);
});
