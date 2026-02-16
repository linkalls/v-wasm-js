import { test, expect } from '@playwright/test';

test('Form collects radio + select + select multiple', async ({ page }) => {
  await page.goto('/form2');

  // pick radio
  await page.getByTestId('color-red').check();

  // select one
  await page.getByTestId('pet').selectOption('cat');

  // select multiple
  await page.getByTestId('langs').selectOption(['ts', 'go']);

  await page.getByTestId('submit2').click();

  const txt = await page.getByTestId('result2').textContent();
  expect(txt).toContain('"color":"red"');
  expect(txt).toContain('"pet":"cat"');
  expect(txt).toMatch(/"langs":\[.*"ts".*"go".*\]/);
});
