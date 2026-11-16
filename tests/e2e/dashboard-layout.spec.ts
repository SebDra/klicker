import { expect, test, type Page } from '@playwright/test';

async function createItem(page: Page, name: string, favorite: boolean) {
  await page.goto('./#/items/new');
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
  // Lange Namen ohne Leerzeichen dürfen das Raster nicht sprengen
  for (const n of [
    'Blutdruckmessungmorgens',
    'Kaffee',
    'Tee',
    'Saft',
    'Mineralwasserflaschengetrunken',
  ])
    await createItem(page, n, true);
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
    // Zeile 1: zwei Kacheln nebeneinander, alles innerhalb des Bildschirms
    expect(list[1]!.y).toBe(list[0]!.y);
    expect(list[1]!.x).toBeGreaterThan(list[0]!.x);
    if (list[2]) expect(list[2].y).toBeGreaterThan(list[0]!.y);
    for (const b of list) expect(b.x + b.w).toBeLessThanOrEqual(width);
  }
});
