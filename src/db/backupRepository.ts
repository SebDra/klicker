import type { Backup } from '../domain/backup';
import { db as defaultDb, type KlickerDB } from './db';
import type { Entry, Item } from './types';

export async function readAll(
  db: KlickerDB = defaultDb,
): Promise<{ items: Item[]; entries: Entry[] }> {
  return db.transaction('r', db.items, db.entries, async () => ({
    items: await db.items.orderBy('sortOrder').toArray(),
    entries: await db.entries.orderBy('timestamp').toArray(),
  }));
}

export type ImportMode = 'replace' | 'merge';

/**
 * Spielt ein geprüftes Backup ein – alles oder nichts (eine Transaktion).
 * `replace`: vorhandene Daten werden vorher gelöscht.
 * `merge`: Datensätze mit gleicher ID werden durch die aus dem Backup ersetzt, alles andere bleibt.
 */
export async function importBackup(
  backup: Backup,
  mode: ImportMode,
  db: KlickerDB = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.items, db.entries, async () => {
    if (mode === 'replace') {
      await db.entries.clear();
      await db.items.clear();
    }
    await db.items.bulkPut(backup.items);
    await db.entries.bulkPut(backup.entries);
  });
}

export async function deleteAll(db: KlickerDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.items, db.entries, async () => {
    await db.entries.clear();
    await db.items.clear();
  });
}
