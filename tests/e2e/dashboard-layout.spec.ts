import { expect, test, type Page } from '@playwright/test';

async function createItem(page: Page, name: string, favorite: boolean, value = false) {
  await page.goto('./#/items/new');
  if (value) {
    await page.getByRole('radio', { name: /Wert/ }).click();
    await page.getByRole('button', { name: /Blutdruck/ }).click();
  }
  await page.getByLabel('Bezeichner').fill(name);
  if (favorite) await page.getByRole('switch', { name: /Favorit/ }).check();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible();
}

const boxes = (page: Page, section: string) =>
  page
    .getByRole('region', { name: section })
    .locator('.tile')
    .evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
      }),
    );

test('Dashboard: alle Kacheln zeilenweise im Raster', async ({ page }, info) => {
  // Zähler und Wert-Items gemischt (Wert-Kacheln lagen früher übereinander);
  // lange Namen ohne Leerzeichen dürfen das Raster nicht sprengen
  await createItem(page, 'Urinieren', true);
  await createItem(page, 'Gewicht', true, true);
  await createItem(page, 'Blutdruckmessungmorgens', true, true);
  await createItem(page, 'Kaffee', true);
  await createItem(page, 'Mineralwasserflaschengetrunken', true);
  for (const n of ['Eins', 'Zwei', 'Drei', 'Vier']) await createItem(page, n, false);

  await page.goto('./#/');
  await page.getByRole('button', { name: /^Eins:/ }).click(); // → Meistgenutzt
  await expect(page.getByRole('region', { name: 'Meistgenutzt' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('dashboard.png'), fullPage: true });

  const fav = await boxes(page, 'Favoriten');
  const others = await boxes(page, 'Weitere Items');

  expect(fav).toHaveLength(5);
  expect(others).toHaveLength(3);
  const width = page.viewportSize()!.width;
  for (const list of [fav, others]) {
    // Handy: 2 Spalten, Zeile für Zeile; keine Kachel liegt auf einer anderen
    list.forEach((b, i) => {
      const left = list[i - (i % 2)]!;
      expect(b.y).toBe(left.y);
      if (i % 2) expect(b.x).toBeGreaterThan(left.x + left.w);
      else if (i > 0) expect(b.y).toBeGreaterThan(list[i - 2]!.y);
      expect(b.w).toBe(list[0]!.w);
      expect(b.w).toBeGreaterThanOrEqual(136);
      expect(b.x + b.w).toBeLessThanOrEqual(width);
    });
  }
});
