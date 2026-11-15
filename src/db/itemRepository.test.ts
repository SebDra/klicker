import { emptyForm, formToDraft } from '../domain/item';
import { KlickerDB } from './db';
import {
  countEntries,
  createItem,
  deleteItem,
  moveItem,
  setArchived,
  updateItem,
} from './itemRepository';

let db: KlickerDB;

beforeEach(async () => {
  db = new KlickerDB(`test-${Math.random()}`);
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

const draft = (name: string) => formToDraft({ ...emptyForm(), name });

describe('itemRepository', () => {
  it('legt Items mit fortlaufender Sortierung an', async () => {
    const a = await createItem(draft('A'), db);
    const b = await createItem(draft('B'), db);
    expect(a.sortOrder).toBe(1);
    expect(b.sortOrder).toBe(2);
    expect(a.archived).toBe(false);
    expect(await db.items.count()).toBe(2);
  });

  it('aktualisiert Items und entfernt geleerte optionale Felder', async () => {
    const a = await createItem({ ...draft('A'), label: 'Kurz' }, db);
    await updateItem(a.id, { ...draft('A2'), label: undefined }, db);
    const saved = await db.items.get(a.id);
    expect(saved?.name).toBe('A2');
    expect(saved).not.toHaveProperty('label');
    expect(saved?.createdAt).toBe(a.createdAt);
  });

  it('verschiebt Items und überspringt archivierte', async () => {
    await createItem(draft('A'), db);
    const b = await createItem(draft('B'), db);
    const c = await createItem(draft('C'), db);
    await setArchived(b.id, true, db);
    const activeOrder = async () =>
      (await db.items.orderBy('sortOrder').toArray()).filter((i) => !i.archived).map((i) => i.name);

    await moveItem(c.id, -1, db);
    expect(await activeOrder()).toEqual(['C', 'A']);

    // Am Rand passiert nichts
    await moveItem(c.id, -1, db);
    expect(await activeOrder()).toEqual(['C', 'A']);
  });

  it('löscht ein Item samt Einträgen', async () => {
    const a = await createItem(draft('A'), db);
    const b = await createItem(draft('B'), db);
    await db.entries.bulkAdd([
      { id: 'e1', itemId: a.id, timestamp: 1, createdAt: 1 },
      { id: 'e2', itemId: a.id, timestamp: 2, createdAt: 2 },
      { id: 'e3', itemId: b.id, timestamp: 3, createdAt: 3 },
    ]);
    expect(await countEntries(a.id, db)).toBe(2);

    await deleteItem(a.id, db);
    expect(await db.items.get(a.id)).toBeUndefined();
    expect(await countEntries(a.id, db)).toBe(0);
    expect(await countEntries(b.id, db)).toBe(1);
  });
});
