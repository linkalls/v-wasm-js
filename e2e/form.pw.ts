import { test, expect } from '@playwright/test';

test('Form collects checkbox + multi fields', async ({ page }) => {
  await page.goto('/form');

  // checkbox unchecked -> not present
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('result')).toContainText('"agree":');
  await expect(page.getByTestId('result')).toContainText('false');

  // check it
  await page.getByTestId('agree').check();

  // multi values: 1 and 2
  await page.getByTestId('tag1').check();
  await page.getByTestId('tag2').check();

  await page.getByTestId('submit').click();

  const txt = await page.getByTestId('result').textContent();
  // JSON.stringify has no spaces; also coercion turns "1"/"2" into numbers.
  expect(txt).toContain('"agree":true');
  expect(txt).toMatch(/"tags":\[.*1.*2.*\]/);
});
