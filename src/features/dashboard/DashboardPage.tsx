import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HistoryIcon } from '../../app/icons';
import { Page } from '../../app/Layout';
import { Toast } from '../../components/Toast';
import { db } from '../../db/db';
import { addEntry, deleteEntry, loadItemStats } from '../../db/entryRepository';
import type { Entry, Item } from '../../db/types';
import { buildDashboard, counterValue, EMPTY_STATS, type ItemStats } from '../../domain/dashboard';
import { formatValues } from '../../domain/entry';
import { displayName } from '../../domain/item';
import { useToday } from '../../hooks/useToday';
import { de } from '../../i18n/de';
import { EntrySheet } from '../entries/EntrySheet';
import { ReminderBanner } from './ReminderBanner';
import { Tile } from './Tile';
import { TileMenu } from './TileMenu';

interface ToastState {
  key: number;
  message: string;
  entryId?: string;
}

async function loadDashboard(now: number) {
  const items = (await db.items.toArray()).filter((i) => !i.archived);
  const stats = await loadItemStats(items, now);
  const entryCount = await db.entries.count();
  return { items, stats, now, entryCount };
}

export function DashboardPage() {
  const today = useToday();
  // `today` als Abhängigkeit: um Mitternacht neu laden, damit Tageszähler auf 0 springen.
  const data = useLiveQuery(() => loadDashboard(Date.now()), [today]);
  const [menuItem, setMenuItem] = useState<Item | null>(null);
  const [entryItem, setEntryItem] = useState<Item | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const statsOf = (item: Item): ItemStats => data?.stats.get(item.id) ?? EMPTY_STATS;
  const notify = (message: string, entryId?: string) =>
    setToast({ key: Date.now(), message, entryId });

  async function activate(item: Item) {
    if (item.type === 'value') {
      setEntryItem(item);
      return;
    }
    const entry = await addEntry({ itemId: item.id, timestamp: Date.now() });
    navigator.vibrate?.(15);
    const n = counterValue(item, statsOf(item)) + 1;
    notify(`${item.icon} ${de.dashboard.counted(displayName(item), n)}`, entry.id);
  }

  function onSaved(item: Item, entry: Entry) {
    setEntryItem(null);
    notify(
      `${item.icon} ${de.dashboard.saved(displayName(item), formatValues(item, entry.values))}`,
      entry.id,
    );
  }

  async function undo(entryId: string) {
    await deleteEntry(entryId);
    notify(de.dashboard.undone);
  }

  if (!data) return <Page title={de.nav.dashboard}>{null}</Page>;

  const { favorites, mostUsed, others } = buildDashboard(data.items, data.stats);

  const grid = (items: Item[]) => (
    <div className="tile-grid">
      {items.map((item) => (
        <Tile
          key={item.id}
          item={item}
          stats={statsOf(item)}
          now={data.now}
          onActivate={(i) => void activate(i)}
          onMenu={setMenuItem}
        />
      ))}
    </div>
  );

  const historyLink = (
    <Link to="/history" className="icon-btn" aria-label={de.history.title} title={de.history.title}>
      <HistoryIcon />
    </Link>
  );

  return (
    <Page title={de.nav.dashboard} actions={historyLink}>
      {data.items.length === 0 ? (
        <div className="empty-state">
          <div className="emoji" aria-hidden>
            👆
          </div>
          <p>{de.dashboard.empty}</p>
          <p>{de.dashboard.emptyHint}</p>
          <Link to="/items/new" className="btn primary">
            {de.dashboard.createFirst}
          </Link>
        </div>
      ) : (
        <>
          <ReminderBanner entries={data.entryCount} />
          <p className="sr-only">{de.dashboard.tileHint}</p>
          {favorites.length > 0 && (
            <section className="dash-section" aria-label={de.dashboard.favorites}>
              <h2 className="dash-title">{de.dashboard.favorites}</h2>
              {grid(favorites)}
            </section>
          )}
          {mostUsed.length > 0 && (
            <section className="dash-section" aria-label={de.dashboard.mostUsed}>
              <h2 className="dash-title">
                {de.dashboard.mostUsed} <small>· {de.dashboard.mostUsedHint}</small>
              </h2>
              {grid(mostUsed)}
            </section>
          )}
          {others.length > 0 && (
            <section className="dash-section" aria-label={de.dashboard.others}>
              <h2 className="dash-title">{de.dashboard.others}</h2>
              {grid(others)}
            </section>
          )}
        </>
      )}

      {menuItem && (
        <TileMenu
          item={menuItem}
          stats={statsOf(menuItem)}
          onClose={() => setMenuItem(null)}
          onRecord={(item) => {
            setMenuItem(null);
            setEntryItem(item);
          }}
        />
      )}

      {entryItem && (
        <EntrySheet
          key={entryItem.id}
          item={entryItem}
          lastEntry={statsOf(entryItem).lastEntry}
          onClose={() => setEntryItem(null)}
          onSaved={(entry) => onSaved(entryItem, entry)}
        />
      )}

      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          actionLabel={toast.entryId ? de.dashboard.undo : undefined}
          onAction={toast.entryId ? () => void undo(toast.entryId!) : undefined}
          onClose={() => setToast(null)}
        />
      )}
    </Page>
  );
}
