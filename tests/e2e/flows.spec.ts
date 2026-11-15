import { expect, test, type Page } from '@playwright/test';

// Jeder Test läuft in einem frischen Browser-Kontext → leere IndexedDB.

async function createCounter(page: Page, name: string, label?: string) {
  await page.goto('./#/items/new');
  await page.getByLabel('Bezeichner').fill(name);
  if (label) await page.getByLabel('Label').fill(label);
  await page.getByRole('switch', { name: /Favorit/ }).check();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
}

test('Zähler: anlegen, antippen, rückgängig, Verlauf', async ({ page }) => {
  await createCounter(page, 'Glas Wasser getrunken', 'Wasser');
  await page
    .getByRole('navigation', { name: 'Hauptnavigation' })
    .getByRole('link', { name: 'Dashboard' })
    .click();

  const tile = page.getByRole('button', { name: /^Wasser: \d+ heute/ });
  await tile.click();
  await tile.click();
  await expect(page.getByRole('button', { name: /^Wasser: 2 heute/ })).toBeVisible();

  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByRole('button', { name: /^Wasser: 1 heute/ })).toBeVisible();

  // Daten überleben ein Neuladen (IndexedDB)
  await page.reload();
  await expect(page.getByRole('button', { name: /^Wasser: 1 heute/ })).toBeVisible();

  await page.getByRole('link', { name: 'Verlauf' }).click();
  await expect(page.getByRole('region', { name: 'Heute' }).getByRole('button')).toHaveCount(1);
});

test('Wert-Item: Blutdruck erfassen und im Diagramm sehen', async ({ page }) => {
  await page.goto('./#/items/new');
  await page.getByRole('radio', { name: /Wert/ }).click();
  await page.getByRole('button', { name: /Blutdruck/ }).click();
  await page.getByRole('switch', { name: /Favorit/ }).check();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.getByRole('link', { name: 'Dashboard' }).click();

  await page.getByRole('button', { name: /^Blutdruck: – noch kein Wert/ }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Systole (mmHg)').fill('121');
  await sheet.getByLabel('Diastole (mmHg)').fill('79');
  await sheet.getByLabel('Puls (bpm)').fill('64');
  await sheet.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('button', { name: /^Blutdruck: 121 \/ 79 \/ 64/ })).toBeVisible();

  await page.getByRole('link', { name: 'Diagramm' }).click();
  await expect(page.getByRole('region', { name: 'mmHg' }).locator('canvas')).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Blutdruck · Puls' }).locator('canvas'),
  ).toBeVisible();
});

test('Backup-Export lädt eine gültige JSON-Datei herunter', async ({ page }) => {
  // Teilen-Menü abschalten, damit der Download-Weg genommen wird
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined });
  });
  await createCounter(page, 'Kaffee');
  await page.goto('./#/settings');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Backup speichern (JSON)' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^klicker-backup-.*\.json$/);
  const path = await download.path();
  const { readFile } = await import('node:fs/promises');
  const backup = JSON.parse(await readFile(path!, 'utf8'));
  expect(backup.format).toBe('klicker-backup');
  expect(backup.items.map((i: { name: string }) => i.name)).toEqual(['Kaffee']);
});

test('funktioniert offline nach dem ersten Besuch', async ({ page, context, browserName }) => {
  // Playwright-WebKit unterstützt Service Worker nicht zuverlässig → Offline auf iOS manuell prüfen
  // (docs/GERAETETEST.md, Punkt 16).
  test.skip(browserName === 'webkit', 'Service Worker in Playwright-WebKit eingeschränkt');
  await page.goto('./');
  // Warten, bis der Service Worker die Seite kontrolliert
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  // Nachgeladene Diagramm-Seite ist ebenfalls vorab gespeichert
  await page.getByRole('link', { name: 'Diagramm' }).click();
  await expect(page.getByRole('heading', { name: 'Diagramm' })).toBeVisible();
  await context.setOffline(false);
});
