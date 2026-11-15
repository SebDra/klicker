import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../db/db';
import { createItem } from '../../db/itemRepository';
import { emptyForm, formToDraft } from '../../domain/item';

beforeEach(async () => {
  await db.items.clear();
  await db.entries.clear();
});

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

describe('Item-Verwaltung', () => {
  it('legt ein Zähler-Item an und zeigt es in der Liste', async () => {
    const user = userEvent.setup();
    renderAt('#/items/new');

    await user.type(screen.getByLabelText('Bezeichner'), 'Glas Wasser getrunken');
    await user.type(screen.getByLabelText('Label'), 'Wasser');
    await user.click(screen.getByRole('switch', { name: /Favorit/ }));
    await user.click(screen.getByRole('button', { name: 'Speichern' }));

    const list = await screen.findByRole('list', { name: 'Items' });
    expect(within(list).getByText('Wasser')).toBeInTheDocument();

    const saved = await db.items.toArray();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      name: 'Glas Wasser getrunken',
      label: 'Wasser',
      type: 'counter',
      favorite: true,
      dailyReset: true,
    });
  });

  it('zeigt Fehler und speichert nicht ohne Bezeichner', async () => {
    const user = userEvent.setup();
    renderAt('#/items/new');

    await user.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(screen.getByText('Bitte einen Bezeichner eingeben.')).toBeInTheDocument();
    expect(await db.items.count()).toBe(0);
  });

  it('legt ein Wert-Item per Vorlage „Blutdruck“ an', async () => {
    const user = userEvent.setup();
    renderAt('#/items/new');

    await user.click(screen.getByRole('radio', { name: /Wert/ }));
    await user.click(screen.getByRole('button', { name: /Blutdruck/ }));
    await user.click(screen.getByRole('button', { name: 'Speichern' }));

    await screen.findByRole('list', { name: 'Items' });
    const [item] = await db.items.toArray();
    expect(item?.name).toBe('Blutdruck');
    expect(item?.icon).toBe('🩺');
    expect(item?.fields.map((f) => f.name)).toEqual(['Systole', 'Diastole', 'Puls']);
  });

  it('wählt ein Emoji über die Auswahl', async () => {
    const user = userEvent.setup();
    renderAt('#/items/new');

    await user.click(screen.getByRole('button', { name: /Icon ändern/ }));
    const dialog = screen.getByRole('dialog', { name: 'Icon wählen' });
    await user.type(within(dialog).getByLabelText(/Suchen/), 'kaffee');
    await user.click(within(dialog).getByRole('button', { name: 'kaffee' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Icon ändern \(☕\)/ })).toBeInTheDocument();
  });

  it('archiviert und löscht ein bestehendes Item', async () => {
    const user = userEvent.setup();
    const item = await createItem(formToDraft({ ...emptyForm(), name: 'Kaffee' }));
    await db.entries.add({ id: 'e1', itemId: item.id, timestamp: 1, createdAt: 1 });
    renderAt(`#/items/${item.id}`);

    expect(
      await screen.findByRole('link', { name: /Verlauf anzeigen \(1 Eintrag\)/ }),
    ).toHaveAttribute('href', `#/history?item=${item.id}`);
    // Art ist gesperrt, weil schon Einträge existieren
    expect(screen.getByRole('radio', { name: /Wert/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Archivieren' }));
    // Erst die Rücknavigation zur Liste abwarten, sonst überholt sie den folgenden Seitenwechsel.
    await screen.findByRole('heading', { name: 'Items' });
    expect((await db.items.get(item.id))?.archived).toBe(true);

    window.location.hash = `#/items/${item.id}`;
    await screen.findByRole('button', { name: 'Wiederherstellen' });
    await user.click(screen.getByRole('button', { name: 'Löschen' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/sein Eintrag/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Endgültig löschen' }));

    await waitFor(async () => expect(await db.items.count()).toBe(0));
    expect(await db.entries.count()).toBe(0);
  });
});
