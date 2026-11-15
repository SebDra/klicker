import type { Item } from '../db/types';
import { buildDashboard, counterValue, type ItemStats } from './dashboard';

let order = 0;
const item = (id: string, patch: Partial<Item> = {}): Item => ({
  id,
  name: id,
  icon: '⭐',
  type: 'counter',
  fields: [],
  dailyReset: true,
  favorite: false,
  sortOrder: ++order,
  archived: false,
  createdAt: 0,
  updatedAt: 0,
  ...patch,
});

const stats = (usage: number, last = 0, today = 0, total = 0): ItemStats => ({
  usage,
  todayCount: today,
  totalCount: total,
  lastEntry: last ? { id: 'e', itemId: 'x', timestamp: last, createdAt: last } : undefined,
});

describe('buildDashboard', () => {
  it('trennt Favoriten, Meistgenutzt und Weitere', () => {
    const items = [
      item('fav', { favorite: true }),
      item('a'),
      item('b'),
      item('c'),
      item('arch', { archived: true }),
    ];
    const s = new Map([
      ['fav', stats(50)],
      ['a', stats(2, 100)],
      ['b', stats(5, 50)],
      ['arch', stats(99)],
    ]);
    const d = buildDashboard(items, s);
    expect(d.favorites.map((i) => i.id)).toEqual(['fav']);
    expect(d.mostUsed.map((i) => i.id)).toEqual(['b', 'a']);
    expect(d.others.map((i) => i.id)).toEqual(['c']);
  });

  it('bei gleicher Nutzung zuerst das zuletzt genutzte', () => {
    const items = [item('a'), item('b')];
    const s = new Map([
      ['a', stats(3, 100)],
      ['b', stats(3, 200)],
    ]);
    expect(buildDashboard(items, s).mostUsed.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('begrenzt Meistgenutzt und schiebt den Rest nach „Weitere“', () => {
    const items = ['a', 'b', 'c'].map((id) => item(id));
    const s = new Map(items.map((i, idx) => [i.id, stats(10 - idx)]));
    const d = buildDashboard(items, s, 2);
    expect(d.mostUsed.map((i) => i.id)).toEqual(['a', 'b']);
    expect(d.others.map((i) => i.id)).toEqual(['c']);
  });
});

describe('counterValue', () => {
  it('Tageszähler oder Gesamtzahl je nach Tagesreset', () => {
    const s = stats(0, 0, 3, 42);
    expect(counterValue(item('x', { dailyReset: true }), s)).toBe(3);
    expect(counterValue(item('x', { dailyReset: false }), s)).toBe(42);
  });
});
