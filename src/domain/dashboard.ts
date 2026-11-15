import type { Entry, Item } from '../db/types';

export const MOST_USED_LIMIT = 8;
export const MOST_USED_DAYS = 14;

export interface ItemStats {
  /** Einträge seit heute 00:00 */
  todayCount: number;
  /** Alle Einträge (nur für Items ohne Tagesreset ermittelt, sonst = todayCount) */
  totalCount: number;
  /** Einträge im Ranking-Zeitraum (letzte 14 Tage) */
  usage: number;
  lastEntry?: Entry;
}

export const EMPTY_STATS: ItemStats = { todayCount: 0, totalCount: 0, usage: 0 };

/** Angezeigter Zählerstand: Tageszähler bei Tagesreset, sonst Gesamtzahl. */
export function counterValue(item: Item, stats: ItemStats): number {
  return item.dailyReset ? stats.todayCount : stats.totalCount;
}

export interface DashboardSections {
  favorites: Item[];
  mostUsed: Item[];
  others: Item[];
}

/**
 * Teilt die aktiven Items auf:
 * - Favoriten in Sortierreihenfolge
 * - Meistgenutzt: Nicht-Favoriten mit Nutzung im Zeitraum, absteigend nach Nutzung,
 *   bei Gleichstand zuletzt genutzt zuerst, dann Sortierreihenfolge; höchstens `limit`
 * - Weitere: alle übrigen aktiven Items in Sortierreihenfolge
 */
export function buildDashboard(
  items: Item[],
  stats: Map<string, ItemStats>,
  limit = MOST_USED_LIMIT,
): DashboardSections {
  const active = items.filter((i) => !i.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  const favorites = active.filter((i) => i.favorite);
  const rest = active.filter((i) => !i.favorite);
  const s = (i: Item) => stats.get(i.id) ?? EMPTY_STATS;

  const mostUsed = rest
    .filter((i) => s(i).usage > 0)
    .sort(
      (a, b) =>
        s(b).usage - s(a).usage ||
        (s(b).lastEntry?.timestamp ?? 0) - (s(a).lastEntry?.timestamp ?? 0) ||
        a.sortOrder - b.sortOrder,
    )
    .slice(0, limit);
  const shown = new Set(mostUsed.map((i) => i.id));
  const others = rest.filter((i) => !shown.has(i.id));
  return { favorites, mostUsed, others };
}
