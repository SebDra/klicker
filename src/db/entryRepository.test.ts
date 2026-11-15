import { emptyForm, formToDraft } from '../domain/item';
import { DAY_MS } from '../domain/time';
import { KlickerDB } from './db';
import {
  addEntry,
  deleteEntry,
  lastEntryOf,
  listEntries,
  loadItemStats,
  updateEntry,
} from './entryRepository';
import { createItem } from './itemRepository';

let db: KlickerDB;

beforeEach(async () => {
  db = new KlickerDB(`test-${Math.random()}`);
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

const now = new Date(2026, 10, 15, 18, 0).getTime();
const hoursAgo = (h: number) => now - h * 3_600_000;

describe('entryRepository', () => {
  it('speichert ohne undefined-Felder und löscht wieder', async () => {
    const e = await addEntry({ itemId: 'x', timestamp: now }, db);
    const saved = await db.entries.get(e.id);
    expect(saved).not.toHaveProperty('values');
    expect(saved).not.toHaveProperty('note');
    await deleteEntry(e.id, db);
    expect(await db.entries.count()).toBe(0);
  });

  it('findet den zeitlich neuesten Eintrag, auch wenn er früher erfasst wurde', async () => {
    await addEntry({ itemId: 'x', timestamp: hoursAgo(1) }, db);
    await addEntry({ itemId: 'x', timestamp: hoursAgo(30) }, db); // nachgetragen
    await addEntry({ itemId: 'y', timestamp: now }, db);
    expect((await lastEntryOf('x', db))?.timestamp).toBe(hoursAgo(1));
  });

  it('aktualisiert Einträge und entfernt geleerte Notizen', async () => {
    const e = await addEntry({ itemId: 'x', timestamp: now, note: 'alt', values: { a: 1 } }, db);
    await updateEntry(e.id, { timestamp: hoursAgo(2), values: { a: 2 }, note: undefined }, db);
    const saved = await db.entries.get(e.id);
    expect(saved).toMatchObject({
      timestamp: hoursAgo(2),
      values: { a: 2 },
      createdAt: e.createdAt,
    });
    expect(saved).not.toHaveProperty('note');
  });

  it('listet neueste zuerst, filtert nach Item und meldet weitere Seiten', async () => {
    for (let h = 0; h < 5; h++) await addEntry({ itemId: 'x', timestamp: hoursAgo(h) }, db);
    await addEntry({ itemId: 'y', timestamp: hoursAgo(0.5) }, db);

    const all = await listEntries({ limit: 3 }, db);
    expect(all.entries.map((e) => e.timestamp)).toEqual([now, hoursAgo(0.5), hoursAgo(1)]);
    expect(all.hasMore).toBe(true);

    const onlyX = await listEntries({ itemId: 'x', limit: 10 }, db);
    expect(onlyX.entries).toHaveLength(5);
    expect(onlyX.entries.every((e) => e.itemId === 'x')).toBe(true);
    expect(onlyX.hasMore).toBe(false);
  });

  it('berechnet Tages-, Gesamt- und Nutzungszahlen', async () => {
    const daily = await createItem(formToDraft({ ...emptyForm(), name: 'Täglich' }), db);
    const total = await createItem(
      formToDraft({ ...emptyForm(), name: 'Gesamt', dailyReset: false }),
      db,
    );
    // heute 2x, gestern 1x, vor 20 Tagen 1x
    for (const ts of [hoursAgo(1), hoursAgo(5), hoursAgo(20), now - 20 * DAY_MS]) {
      await addEntry({ itemId: daily.id, timestamp: ts }, db);
      await addEntry({ itemId: total.id, timestamp: ts }, db);
    }

    const stats = await loadItemStats([daily, total], now, db);
    expect(stats.get(daily.id)).toMatchObject({ todayCount: 2, totalCount: 2, usage: 3 });
    expect(stats.get(total.id)).toMatchObject({ todayCount: 2, totalCount: 4, usage: 3 });
    expect(stats.get(daily.id)?.lastEntry?.timestamp).toBe(hoursAgo(1));
  });
});
