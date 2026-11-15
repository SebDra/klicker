import { expect, test } from '@playwright/test';

test('App startet und Navigation funktioniert', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  for (const name of ['Items', 'Diagramm', 'Einstellungen', 'Dashboard']) {
    await nav.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
});

test('Manifest ist eingebunden', async ({ page }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await page.request.get(href!);
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.display).toBe('standalone');
});
