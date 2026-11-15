import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { db } from '../../db/db';
import { addEntry } from '../../db/entryRepository';
import { createItem } from '../../db/itemRepository';
import type { Item } from '../../db/types';
import { createBackup } from '../../domain/backup';
import { emptyForm, formToDraft } from '../../domain/item';
import { saveFile } from '../../platform/download';

vi.mock('../../platform/download', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../platform/download')>()),
  saveFile: vi.fn(async () => true),
}));
const saveFileMock = vi.mocked(saveFile);

beforeEach(async () => {
  localStorage.clear();
  saveFileMock.mockClear();
  delete document.documentElement.dataset.theme;
  await db.items.clear();
  await db.entries.clear();
});

const make = (name: string) => createItem(formToDraft({ ...emptyForm(), name }));

function renderSettings() {
  window.location.hash = '#/settings';
  return render(<App />);
}

describe('Einstellungen', () => {
  it('schaltet das Farbschema um und merkt es sich', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(await screen.findByRole('radio', { name: 'Dunkel' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('klicker.theme')).toBe('dark');

    await user.click(screen.getByRole('radio', { name: 'System' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem('klicker.theme')).toBeNull();
  });

  it('exportiert ein vollständiges JSON-Backup und CSV', async () => {
    const user = userEvent.setup();
    const item = await make('Wasser');
    await addEntry({ itemId: item.id, timestamp: Date.now(), note: 'Glas' });
    renderSettings();

    expect(await screen.findByText('Noch kein Backup erstellt.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Backup speichern (JSON)' }));

    await waitFor(() => expect(saveFileMock).toHaveBeenCalledTimes(1));
    const [name, mime, content] = saveFileMock.mock.calls[0]!;
    expect(name).toMatch(/^klicker-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
    expect(mime).toBe('application/json');
    const backup = JSON.parse(content);
    expect(backup).toMatchObject({ format: 'klicker-backup', version: 1 });
    expect(backup.items).toHaveLength(1);
    expect(backup.entries[0].note).toBe('Glas');
    expect(await screen.findByText(/Letztes Backup: heute/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Einträge als CSV (Excel)' }));
    await waitFor(() => expect(saveFileMock).toHaveBeenCalledTimes(2));
    expect(saveFileMock.mock.calls[1]![2]).toContain(';Wasser;;Zähler;;;;Glas');
  });

  it('spielt ein Backup nach Rückfrage ein (Ersetzen)', async () => {
    const user = userEvent.setup();
    await make('Alt');
    const neu: Item = {
      id: 'neu-1',
      name: 'Neu',
      icon: '⭐',
      type: 'counter',
      fields: [],
      dailyReset: true,
      favorite: false,
      sortOrder: 1,
      archived: false,
      createdAt: 1,
      updatedAt: 1,
    };
    const backup = createBackup(
      [neu],
      [{ id: 'e1', itemId: 'neu-1', timestamp: 1_700_000_000_000, createdAt: 1 }],
      '0.1.0',
    );
    renderSettings();

    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
    await user.upload(await screen.findByLabelText('Backup einspielen …'), file);

    const dialog = await screen.findByRole('alertdialog', { name: 'Backup einspielen?' });
    expect(within(dialog).getByText(/1 Items und 1 Einträge/)).toBeVisible();
    // Bei vorhandenen Daten ist „Zusammenführen“ vorausgewählt
    expect(within(dialog).getByRole('radio', { name: 'Zusammenführen' })).toBeChecked();
    await user.click(within(dialog).getByRole('radio', { name: 'Ersetzen' }));
    expect(within(dialog).getByText(/werden gelöscht und durch das Backup ersetzt/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Einspielen' }));

    await waitFor(async () =>
      expect((await db.items.toArray()).map((i) => i.name)).toEqual(['Neu']),
    );
    expect(await db.entries.count()).toBe(1);
    expect(screen.getByRole('status')).toHaveTextContent('Backup eingespielt: 1 Items, 1 Einträge');
  });

  it('meldet ungültige Dateien, ohne etwas zu ändern', async () => {
    const user = userEvent.setup();
    await make('Bestand');
    renderSettings();

    const file = new File(['{"foo":1}'], 'x.json', { type: 'application/json' });
    await user.upload(await screen.findByLabelText('Backup einspielen …'), file);
    expect(await screen.findByRole('status')).toHaveTextContent('kein Klicker-Backup');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await db.items.count()).toBe(1);
  });

  it('löscht alle Daten erst nach Bestätigung', async () => {
    const user = userEvent.setup();
    const item = await make('Wasser');
    await addEntry({ itemId: item.id, timestamp: 1 });
    renderSettings();

    await user.click(await screen.findByRole('button', { name: 'Alle Daten löschen' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/Alle 1 Items und 1 Einträge/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));
    expect(await db.items.count()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Alle Daten löschen' }));
    await user.click(screen.getByRole('button', { name: 'Endgültig löschen' }));
    await waitFor(async () => expect(await db.items.count()).toBe(0));
    expect(await db.entries.count()).toBe(0);
  });
});
