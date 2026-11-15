import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlusIcon } from '../../app/icons';
import { BACK_TO_PREVIOUS, Page } from '../../app/Layout';
import { Toast } from '../../components/Toast';
import { db } from '../../db/db';
import { listEntries } from '../../db/entryRepository';
import type { Entry, Item } from '../../db/types';
import { formatValues } from '../../domain/entry';
import { formatDayHeading, formatTime, groupByDay } from '../../domain/history';
import { displayName } from '../../domain/item';
import { useToday } from '../../hooks/useToday';
import { de } from '../../i18n/de';
import { EntrySheet } from '../entries/EntrySheet';

const PAGE_SIZE = 100;

type SheetState = { item: Item; entry?: Entry } | null;

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const itemId = params.get('item') ?? undefined;
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState<{ key: number; message: string } | null>(null);
  const today = useToday();
  const filterId = useId();

  const items = useLiveQuery(() => db.items.orderBy('sortOrder').toArray(), []);
  const page = useLiveQuery(() => listEntries({ itemId, limit }), [itemId, limit]);
  const byId = useMemo(() => new Map((items ?? []).map((i) => [i.id, i])), [items]);
  const selected = itemId ? byId.get(itemId) : undefined;

  const setFilter = (id: string) => {
    setLimit(PAGE_SIZE);
    setParams(id ? { item: id } : {}, { replace: true });
  };
  const notify = (message: string) => setToast({ key: Date.now(), message });

  const groups = page ? groupByDay(page.entries) : [];

  return (
    <Page
      title={selected ? `${de.history.title}: ${displayName(selected)}` : de.history.title}
      back={BACK_TO_PREVIOUS}
    >
      <div className="toolbar">
        <label className="sr-only" htmlFor={filterId}>
          {de.history.filter}
        </label>
        <select
          id={filterId}
          className="input"
          value={itemId ?? ''}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">{de.history.allItems}</option>
          {(items ?? []).map((i) => (
            <option key={i.id} value={i.id}>
              {i.icon} {displayName(i)}
              {i.archived ? ` (${de.items.archived})` : ''}
            </option>
          ))}
        </select>
      </div>

      {page && groups.length === 0 && (
        <p className="hint center">{itemId ? de.history.emptyItem : de.history.empty}</p>
      )}

      {groups.map((g) => (
        <section key={g.day} className="history-day" aria-label={formatDayHeading(g.day, today)}>
          <h2 className="dash-title history-heading">
            <span>{formatDayHeading(g.day, today)}</span>
            {selected?.type === 'counter' && (
              <span className="hint">{de.history.count(g.entries.length)}</span>
            )}
          </h2>
          <ul className="list">
            {g.entries.map((e) => {
              const item = byId.get(e.itemId);
              return (
                <li key={e.id}>
                  <EntryRow
                    entry={e}
                    item={item}
                    showItem={!itemId}
                    onOpen={() => item && setSheet({ item, entry: e })}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {page?.hasMore && (
        <button
          type="button"
          className="btn secondary block"
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
        >
          {de.history.loadMore}
        </button>
      )}

      {selected && !selected.archived && (
        <>
          <div className="fab-spacer" />
          <button
            type="button"
            className="fab"
            aria-label={de.history.add}
            onClick={() => setSheet({ item: selected })}
          >
            <PlusIcon />
          </button>
        </>
      )}

      {sheet && (
        <EntrySheet
          key={sheet.entry?.id ?? 'new'}
          item={sheet.item}
          entry={sheet.entry}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            notify(de.history.updated);
          }}
          onDeleted={() => {
            setSheet(null);
            notify(de.history.deleted);
          }}
        />
      )}

      {toast && <Toast key={toast.key} message={toast.message} onClose={() => setToast(null)} />}
    </Page>
  );
}

function EntryRow({
  entry,
  item,
  showItem,
  onOpen,
}: {
  entry: Entry;
  item?: Item;
  showItem: boolean;
  onOpen: () => void;
}) {
  const time = formatTime(entry.timestamp);
  const name = item ? displayName(item) : de.history.unknownItem;
  const values = item ? formatValues(item, entry.values) : '';

  return (
    <button
      type="button"
      className="item-row entry-row"
      aria-label={de.history.edit(name, time)}
      disabled={!item}
      onClick={onOpen}
    >
      <span className="entry-time">{time}</span>
      {showItem && (
        <span className="item-icon small" aria-hidden>
          {item?.icon ?? '❔'}
        </span>
      )}
      <span className="item-text">
        <span className="item-title">
          {showItem ? name : values || '+1'}
          {showItem && values && <span className="entry-values"> · {values}</span>}
        </span>
        {entry.note && <span className="item-sub">{entry.note}</span>}
      </span>
    </button>
  );
}
