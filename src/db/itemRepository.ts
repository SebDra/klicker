import { db as defaultDb, type KlickerDB } from './db';
import { newId } from './id';
import type { Item, ItemDraft } from './types';

/** Entfernt Schlüssel mit `undefined`, damit gespeicherte Datensätze schlank und eindeutig bleiben. */
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function cleanDraft<T extends ItemDraft>(draft: T): T {
  return compact({ ...draft, fields: draft.fields.map(compact) });
}

export async function createItem(draft: ItemDraft, db: KlickerDB = defaultDb): Promise<Item> {
  const now = Date.now();
  const last = await db.items.orderBy('sortOrder').last();
  const item: Item = {
    ...cleanDraft(draft),
    id: newId(),
    sortOrder: (last?.sortOrder ?? 0) + 1,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.items.add(item);
  return item;
}

export async function updateItem(
  id: string,
  draft: ItemDraft,
  db: KlickerDB = defaultDb,
): Promise<void> {
  const existing = await db.items.get(id);
  if (!existing) throw new Error(`Item ${id} nicht gefunden`);
  // put statt update: geleerte optionale Felder (label, memo, unit …) werden so sauber entfernt.
  // Erst den rohen Entwurf drüberlegen (undefined überschreibt alte Werte), dann kompaktieren.
  const next: Item = { ...existing, ...draft, updatedAt: Date.now() };
  await db.items.put(cleanDraft(next));
}

export async function setArchived(id: string, archived: boolean, db: KlickerDB = defaultDb) {
  await db.items.update(id, { archived, updatedAt: Date.now() });
}

export async function setFavorite(id: string, favorite: boolean, db: KlickerDB = defaultDb) {
  await db.items.update(id, { favorite, updatedAt: Date.now() });
}

export function countEntries(itemId: string, db: KlickerDB = defaultDb): Promise<number> {
  return db.entries.where('itemId').equals(itemId).count();
}

/** Löscht ein Item endgültig inklusive aller Einträge. */
export async function deleteItem(id: string, db: KlickerDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.items, db.entries, async () => {
    await db.entries.where('itemId').equals(id).delete();
    await db.items.delete(id);
  });
}

/** Verschiebt ein aktives Item in der Sortierung um eine Position nach oben (-1) oder unten (+1). */
export async function moveItem(id: string, direction: -1 | 1, db: KlickerDB = defaultDb) {
  await db.transaction('rw', db.items, async () => {
    const list = (await db.items.orderBy('sortOrder').toArray()).filter((i) => !i.archived);
    const idx = list.findIndex((i) => i.id === id);
    const current = list[idx];
    const neighbor = list[idx + direction];
    if (idx < 0 || !current || !neighbor) return;
    await db.items.update(current.id, { sortOrder: neighbor.sortOrder });
    await db.items.update(neighbor.id, { sortOrder: current.sortOrder });
  });
}
