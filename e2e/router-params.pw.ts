import { test, expect } from '@playwright/test';

test('router: nested params are merged (parent + child)', async ({ page }) => {
  await page.goto('/nested/aaa/child/bbb');
  await expect(page.getByTestId('nested-parent')).toHaveText('parent=aaa');
  await expect(page.getByTestId('nested-child')).toHaveText('child=bbb');
});
