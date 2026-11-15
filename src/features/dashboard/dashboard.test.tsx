import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../db/db';
import { addEntry } from '../../db/entryRepository';
import { createItem } from '../../db/itemRepository';
import { emptyForm, FIELD_PRESETS, formToDraft, type ItemForm } from '../../domain/item';

beforeEach(async () => {
  await db.items.clear();
  await db.entries.clear();
});

const make = (patch: Partial<ItemForm>) => createItem(formToDraft({ ...emptyForm(), ...patch }));

function renderDashboard() {
  window.location.hash = '#/';
  return render(<App />);
}

describe('Dashboard', () => {
  it('zählt per Antippen hoch und kann rückgängig machen', async () => {
    const user = userEvent.setup();
    const item = await make({ name: 'Glas Wasser', label: 'Wasser', icon: '💧', favorite: true });
    renderDashboard();

    const favs = await screen.findByRole('region', { name: 'Favoriten' });
    await user.click(within(favs).getByRole('button', { name: /^Wasser: 0 heute/ }));

    expect(await within(favs).findByRole('button', { name: /^Wasser: 1 heute/ })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Wasser: 1');
    expect(await db.entries.where('itemId').equals(item.id).count()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Rückgängig' }));
    expect(await within(favs).findByRole('button', { name: /^Wasser: 0 heute/ })).toBeVisible();
    expect(await db.entries.count()).toBe(0);
  });

  it('zählt gestrige Einträge nur ohne Tagesreset', async () => {
    const yesterday = Date.now() - 24 * 3_600_000;
    const daily = await make({ name: 'Täglich', favorite: true });
    const total = await make({ name: 'Gesamt', favorite: true, dailyReset: false });
    await addEntry({ itemId: daily.id, timestamp: yesterday });
    await addEntry({ itemId: total.id, timestamp: yesterday });
    renderDashboard();

    expect(await screen.findByRole('button', { name: /^Täglich: 0 heute/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Gesamt: 1 gesamt/ })).toBeVisible();
  });

  it('fragt bei Wert-Items die Werte ab und zeigt den letzten Wert', async () => {
    const user = userEvent.setup();
    await make({
      name: 'Blutdruck',
      icon: '🩺',
      type: 'value',
      favorite: true,
      fields: FIELD_PRESETS[0]!.fields(),
    });
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: /^Blutdruck: – noch kein Wert/ }));
    const sheet = screen.getByRole('dialog');
    await user.type(within(sheet).getByLabelText('Systole (mmHg)'), '300');
    await user.click(within(sheet).getByRole('button', { name: 'Speichern' }));
    expect(within(sheet).getByText('Höchstens 260.')).toBeVisible();

    await user.clear(within(sheet).getByLabelText('Systole (mmHg)'));
    await user.type(within(sheet).getByLabelText('Systole (mmHg)'), '120');
    await user.type(within(sheet).getByLabelText('Diastole (mmHg)'), '80');
    await user.type(within(sheet).getByLabelText('Puls (bpm)'), '65');
    await user.click(within(sheet).getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(
      await screen.findByRole('button', { name: /^Blutdruck: 120 \/ 80 \/ 65 heute/ }),
    ).toBeVisible();
    const [entry] = await db.entries.toArray();
    const [item] = await db.items.toArray();
    expect(item!.fields.map((f) => entry!.values![f.key])).toEqual([120, 80, 65]);
  });

  it('öffnet bei langem Drücken das Menü und erfasst rückdatiert mit Notiz', async () => {
    const user = userEvent.setup();
    const item = await make({ name: 'Kaffee', memo: 'Max. 3 pro Tag', favorite: true });
    renderDashboard();

    const tile = await screen.findByRole('button', { name: /^Kaffee: 0/ });
    fireEvent.contextMenu(tile);
    const menu = screen.getByRole('dialog', { name: /Kaffee/ });
    expect(within(menu).getByText('Max. 3 pro Tag')).toBeVisible();

    await user.click(within(menu).getByRole('button', { name: /Zeitpunkt \/ Notiz/ }));
    const sheet = screen.getByRole('dialog', { name: /Kaffee/ });
    fireEvent.change(within(sheet).getByLabelText('Zeitpunkt'), {
      target: { value: '2026-01-02T08:30' },
    });
    await user.type(within(sheet).getByLabelText('Notiz'), 'Espresso');
    await user.click(within(sheet).getByRole('button', { name: 'Speichern' }));

    await waitFor(async () => expect(await db.entries.count()).toBe(1));
    const [entry] = await db.entries.toArray();
    expect(entry).toMatchObject({
      itemId: item.id,
      timestamp: new Date(2026, 0, 2, 8, 30).getTime(),
      note: 'Espresso',
    });
    // Rückdatiert: zählt nicht für heute
    expect(screen.getByRole('button', { name: /^Kaffee: 0 heute/ })).toBeVisible();
  });

  it('zeigt Items ohne Favorit/Nutzung direkt, sonst eingeklappt', async () => {
    const user = userEvent.setup();
    await make({ name: 'Eins' });
    await make({ name: 'Zwei' });
    renderDashboard();

    // Neue Nutzer: alles sichtbar
    expect(await screen.findByRole('button', { name: /^Eins: 0/ })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^Zwei: 0/ }));

    // Jetzt ist „Zwei“ meistgenutzt, „Eins“ unter „Weitere“ eingeklappt
    const most = await screen.findByRole('region', { name: 'Meistgenutzt' });
    expect(within(most).getByRole('button', { name: /^Zwei: 1/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Eins: 0/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Weitere Items anzeigen (1)' }));
    expect(screen.getByRole('button', { name: /^Eins: 0/ })).toBeVisible();
  });
});
