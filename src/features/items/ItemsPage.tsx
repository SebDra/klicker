import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, PlusIcon } from '../../app/icons';
import { Page } from '../../app/Layout';
import { db } from '../../db/db';
import { moveItem } from '../../db/itemRepository';
import type { Item } from '../../db/types';
import { displayName } from '../../domain/item';
import { de } from '../../i18n/de';

type View = 'active' | 'archive';

export function ItemsPage() {
  const items = useLiveQuery(() => db.items.orderBy('sortOrder').toArray(), []);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('active');
  const [sorting, setSorting] = useState(false);

  const all = items ?? [];
  const active = all.filter((i) => !i.archived);
  const archived = all.filter((i) => i.archived);
  const q = query.trim().toLowerCase();
  const visible = (view === 'active' ? active : archived).filter(
    (i) => !q || [i.name, i.label, i.memo].some((s) => s?.toLowerCase().includes(q)),
  );
  const canSort = view === 'active' && !q && active.length > 1;

  const actions = canSort && (
    <button type="button" className="btn ghost" onClick={() => setSorting((s) => !s)}>
      {sorting ? de.items.sortDone : de.items.sort}
    </button>
  );

  return (
    <Page title={de.nav.items} actions={actions}>
      {items === undefined ? null : all.length === 0 ? (
        <div className="empty-state">
          <div className="emoji" aria-hidden>
            📋
          </div>
          <p>{de.items.empty}</p>
          <Link to="/items/new" className="btn primary">
            {de.dashboard.createFirst}
          </Link>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <input
              type="search"
              className="input"
              placeholder={de.items.search}
              aria-label={de.items.search}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSorting(false);
              }}
            />
            {archived.length > 0 && (
              <div className="segmented" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'active'}
                  onClick={() => setView('active')}
                >
                  {de.items.active} ({active.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'archive'}
                  onClick={() => {
                    setView('archive');
                    setSorting(false);
                  }}
                >
                  {de.items.archive} ({archived.length})
                </button>
              </div>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="hint center">
              {q ? de.items.noMatch : view === 'archive' ? de.items.emptyArchive : de.items.empty}
            </p>
          ) : (
            <ul className="list" aria-label={de.nav.items}>
              {visible.map((item, idx) => (
                <li key={item.id}>
                  {sorting && canSort ? (
                    <div className="item-row">
                      <ItemSummary item={item} />
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`${displayName(item)}: ${de.common.moveUp}`}
                        disabled={idx === 0}
                        onClick={() => void moveItem(item.id, -1)}
                      >
                        <ArrowUpIcon />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`${displayName(item)}: ${de.common.moveDown}`}
                        disabled={idx === visible.length - 1}
                        onClick={() => void moveItem(item.id, 1)}
                      >
                        <ArrowDownIcon />
                      </button>
                    </div>
                  ) : (
                    <Link to={`/items/${item.id}`} className="item-row">
                      <ItemSummary item={item} />
                      <ChevronRightIcon />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {!sorting && (
        <Link to="/items/new" className="fab" aria-label={de.items.new}>
          <PlusIcon />
        </Link>
      )}
    </Page>
  );
}

function ItemSummary({ item }: { item: Item }) {
  const title = displayName(item);
  return (
    <>
      <span className="item-icon" aria-hidden>
        {item.icon}
      </span>
      <span className="item-text">
        <span className="item-title">
          {title}
          {item.favorite && (
            <span className="fav" title={de.items.favorite} aria-label={de.items.favorite}>
              {' '}
              ★
            </span>
          )}
        </span>
        <span className="item-sub">
          {item.type === 'counter' ? de.items.typeCounter : de.items.typeValue}
          {item.type === 'value' &&
            ` · ${item.fields.map((f) => (f.unit ? `${f.name} (${f.unit})` : f.name)).join(', ')}`}
          {title !== item.name && ` · ${item.name}`}
        </span>
      </span>
    </>
  );
}
