import Dexie from 'dexie';
import { MOST_USED_DAYS, type ItemStats } from '../domain/dashboard';
import { DAY_MS, startOfDay } from '../domain/time';
import { db as defaultDb, type KlickerDB } from './db';
import { newId } from './id';
import type { Entry, Item } from './types';

export type NewEntry = Pick<Entry, 'itemId' | 'timestamp'> &
  Partial<Pick<Entry, 'values' | 'note'>>;

export async function addEntry(data: NewEntry, db: KlickerDB = defaultDb): Promise<Entry> {
  const entry: Entry = { id: newId(), createdAt: Date.now(), ...data };
  if (entry.values === undefined) delete entry.values;
  if (entry.note === undefined) delete entry.note;
  await db.entries.add(entry);
  return entry;
}

export async function deleteEntry(id: string, db: KlickerDB = defaultDb): Promise<void> {
  await db.entries.delete(id);
}

/** Neuester Eintrag eines Items (nach Zeitpunkt, nicht nach Erfassung). */
export function lastEntryOf(itemId: string, db: KlickerDB = defaultDb): Promise<Entry | undefined> {
  return db.entries
    .where('[itemId+timestamp]')
    .between([itemId, Dexie.minKey], [itemId, Dexie.maxKey])
    .last();
}

/**
 * Kennzahlen für das Dashboard. Liest nur die Einträge der letzten Tage am Stück;
 * Gesamtzahlen werden nur für Items ohne Tagesreset gezählt.
 */
export async function loadItemStats(
  items: Item[],
  now: number,
  db: KlickerDB = defaultDb,
): Promise<Map<string, ItemStats>> {
  const dayStart = startOfDay(now);
  const rankStart = now - MOST_USED_DAYS * DAY_MS;
  const recent = await db.entries
    .where('timestamp')
    .aboveOrEqual(Math.min(dayStart, rankStart))
    .toArray();

  const result = new Map<string, ItemStats>();
  await Promise.all(
    items.map(async (item) => {
      const own = recent.filter((e) => e.itemId === item.id);
      const todayCount = own.filter((e) => e.timestamp >= dayStart).length;
      const totalCount = item.dailyReset
        ? todayCount
        : await db.entries.where('itemId').equals(item.id).count();
      result.set(item.id, {
        todayCount,
        totalCount,
        usage: own.filter((e) => e.timestamp >= rankStart).length,
        lastEntry: await lastEntryOf(item.id, db),
      });
    }),
  );
  return result;
}
