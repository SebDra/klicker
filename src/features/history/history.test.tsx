import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../db/db';
import { addEntry } from '../../db/entryRepository';
import { createItem } from '../../db/itemRepository';
import { emptyForm, formToDraft, newField, type ItemForm } from '../../domain/item';

beforeEach(async () => {
  await db.items.clear();
  await db.entries.clear();
});

const make = (patch: Partial<ItemForm>) => createItem(formToDraft({ ...emptyForm(), ...patch }));

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

const todayAt = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
const yesterdayAt = (h: number) => todayAt(h) - 24 * 3_600_000;

describe('Verlauf', () => {
  it('zeigt Einträge aller Items nach Tagen gruppiert', async () => {
    const wasser = await make({ name: 'Wasser', icon: '💧' });
    const gewicht = await make({
      name: 'Gewicht',
      type: 'value',
      fields: [newField({ name: 'Gewicht', unit: 'kg', decimals: 1 })],
    });
    const key = (await db.items.get(gewicht.id))!.fields[0]!.key;
    await addEntry({ itemId: wasser.id, timestamp: todayAt(0, 1) });
    await addEntry({ itemId: gewicht.id, timestamp: yesterdayAt(7), values: { [key]: 72.5 } });
    renderAt('#/history');

    const heute = await screen.findByRole('region', { name: 'Heute' });
    expect(within(heute).getByRole('button', { name: /Wasser, 00:01/ })).toBeVisible();
    const gestern = screen.getByRole('region', { name: 'Gestern' });
    expect(within(gestern).getByText('· 72,5 kg')).toBeVisible();
  });

  it('filtert nach Item und zeigt Tagessummen bei Zählern', async () => {
    const user = userEvent.setup();
    const a = await make({ name: 'Kaffee' });
    const b = await make({ name: 'Tee' });
    await addEntry({ itemId: a.id, timestamp: todayAt(0, 5) });
    await addEntry({ itemId: a.id, timestamp: todayAt(0, 10) });
    await addEntry({ itemId: b.id, timestamp: todayAt(0, 7) });
    renderAt('#/history');

    await screen.findByRole('button', { name: /Tee, 00:07/ });
    await user.selectOptions(screen.getByLabelText('Item'), a.id);

    expect(await screen.findByRole('heading', { name: 'Verlauf: Kaffee' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Tee/ })).not.toBeInTheDocument();
    expect(screen.getByText('2×')).toBeVisible();
    expect(window.location.hash).toBe(`#/history?item=${a.id}`);
  });

  it('bearbeitet Werte, Zeitpunkt und Notiz eines Eintrags', async () => {
    const user = userEvent.setup();
    const item = await make({
      name: 'Gewicht',
      type: 'value',
      fields: [newField({ name: 'Gewicht', unit: 'kg', decimals: 1 })],
    });
    const key = (await db.items.get(item.id))!.fields[0]!.key;
    const entry = await addEntry({
      itemId: item.id,
      timestamp: yesterdayAt(7) + 15_000,
      values: { [key]: 72.5, alt: 1 },
      note: 'nüchtern',
    });
    renderAt(`#/history?item=${item.id}`);

    await user.click(await screen.findByRole('button', { name: /Gewicht, 07:00: bearbeiten/ }));
    const sheet = screen.getByRole('dialog');
    const input = within(sheet).getByLabelText('Gewicht (kg)');
    expect(input).toHaveValue('72,5');
    await user.clear(input);
    await user.type(input, '71,9');
    await user.clear(within(sheet).getByLabelText('Notiz'));
    await user.click(within(sheet).getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const saved = await db.entries.get(entry.id);
    // Zeit unverändert (sekundengenau), Wert entfernter Felder bleibt, Notiz gelöscht
    expect(saved).toMatchObject({ timestamp: entry.timestamp, values: { [key]: 71.9, alt: 1 } });
    expect(saved).not.toHaveProperty('note');
    expect(screen.getByRole('status')).toHaveTextContent('Eintrag gespeichert');
  });

  it('löscht einen Eintrag nach Rückfrage', async () => {
    const user = userEvent.setup();
    const item = await make({ name: 'Kaffee' });
    await addEntry({ itemId: item.id, timestamp: todayAt(0, 5) });
    renderAt(`#/history?item=${item.id}`);

    await user.click(await screen.findByRole('button', { name: /Kaffee, 00:05/ }));
    await user.click(screen.getByRole('button', { name: 'Eintrag löschen' }));
    const confirm = screen.getByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Löschen' }));

    await waitFor(async () => expect(await db.entries.count()).toBe(0));
    expect(await screen.findByText('Für dieses Item gibt es noch keine Einträge.')).toBeVisible();
  });

  it('trägt für ein gefiltertes Item einen Eintrag nach', async () => {
    const user = userEvent.setup();
    const item = await make({ name: 'Kaffee' });
    renderAt(`#/history?item=${item.id}`);

    await user.click(await screen.findByRole('button', { name: 'Eintrag nachtragen' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Speichern' }));
    await waitFor(async () => expect(await db.entries.count()).toBe(1));
    expect(await screen.findByRole('region', { name: 'Heute' })).toBeVisible();
  });

  it('lädt ältere Einträge seitenweise nach', async () => {
    const user = userEvent.setup();
    const item = await make({ name: 'Klick' });
    const start = todayAt(0, 1) - 200 * 3_600_000;
    await db.entries.bulkAdd(
      Array.from({ length: 130 }, (_, i) => ({
        id: `e${i}`,
        itemId: item.id,
        timestamp: start + i * 3_600_000,
        createdAt: 0,
      })),
    );
    renderAt(`#/history?item=${item.id}`);

    await user.click(await screen.findByRole('button', { name: 'Ältere Einträge laden' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /bearbeiten/ })).toHaveLength(130),
    );
    expect(screen.queryByRole('button', { name: 'Ältere Einträge laden' })).not.toBeInTheDocument();
  });
});
