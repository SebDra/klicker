import Dexie, { type EntityTable } from 'dexie';
import type { Entry, Item } from './types';

/**
 * Lokale Datenbank (IndexedDB). Schema-Änderungen immer als neue `version(n)` ergänzen,
 * bestehende Versionen nie verändern.
 * Hinweis: Boolesche Felder (favorite, archived) sind in IndexedDB nicht indizierbar
 * und werden im Speicher gefiltert.
 */
export class KlickerDB extends Dexie {
  items!: EntityTable<Item, 'id'>;
  entries!: EntityTable<Entry, 'id'>;

  constructor(name = 'klicker') {
    super(name);
    this.version(1).stores({
      items: 'id, sortOrder',
      entries: 'id, itemId, timestamp, [itemId+timestamp]',
    });
  }
}

export const db = new KlickerDB();
