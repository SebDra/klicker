import { createBackup } from '../domain/backup';
import { emptyForm, formToDraft } from '../domain/item';
import { deleteAll, importBackup, readAll } from './backupRepository';
import { KlickerDB } from './db';
import { addEntry } from './entryRepository';
import { createItem } from './itemRepository';

let db: KlickerDB;
beforeEach(async () => {
  db = new KlickerDB(`test-${Math.random()}`);
  await db.open();
});
afterEach(async () => {
  await db.delete();
});

const make = (name: string) => createItem(formToDraft({ ...emptyForm(), name }), db);

describe('backupRepository', () => {
  it('ersetzt oder führt zusammen', async () => {
    const a = await make('A');
    await addEntry({ itemId: a.id, timestamp: 1 }, db);
    const { items, entries } = await readAll(db);
    const backup = createBackup(items, entries, '1');

    const b = await make('B');
    await addEntry({ itemId: b.id, timestamp: 2 }, db);

    await importBackup(backup, 'merge', db);
    expect(await db.items.count()).toBe(2);
    expect(await db.entries.count()).toBe(2);

    await importBackup(backup, 'replace', db);
    expect((await db.items.toArray()).map((i) => i.name)).toEqual(['A']);
    expect(await db.entries.count()).toBe(1);
  });

  it('bricht bei Fehlern komplett ab', async () => {
    await make('Bestand');
    const broken = createBackup([null as never], [], '1');
    await expect(importBackup(broken, 'replace', db)).rejects.toThrow();
    expect((await db.items.toArray()).map((i) => i.name)).toEqual(['Bestand']);
  });

  it('löscht alles', async () => {
    const a = await make('A');
    await addEntry({ itemId: a.id, timestamp: 1 }, db);
    await deleteAll(db);
    expect(await db.items.count()).toBe(0);
    expect(await db.entries.count()).toBe(0);
  });
});
