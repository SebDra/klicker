import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '../../components/BottomSheet';
import { setFavorite } from '../../db/itemRepository';
import type { Item } from '../../db/types';
import type { ItemStats } from '../../domain/dashboard';
import { formatValues } from '../../domain/entry';
import { displayName } from '../../domain/item';
import { formatWhen } from '../../domain/time';
import { de } from '../../i18n/de';

interface Props {
  item: Item;
  stats: ItemStats;
  onRecord: (item: Item) => void;
  onClose: () => void;
}

/** Optionen einer Kachel (langes Drücken). */
export function TileMenu({ item, stats, onRecord, onClose }: Props) {
  const navigate = useNavigate();
  const last = stats.lastEntry;
  const lastText = last
    ? [formatWhen(last.timestamp), formatValues(item, last.values), last.note]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  return (
    <BottomSheet open title={`${item.icon} ${displayName(item)}`} onClose={onClose}>
      {item.label && <p className="menu-sub">{item.name}</p>}
      {item.memo && <p className="menu-memo">{item.memo}</p>}
      {lastText && (
        <p className="hint">
          {de.tileMenu.last}: {lastText}
        </p>
      )}
      <div className="menu-actions">
        <button type="button" className="btn secondary" onClick={() => onRecord(item)}>
          🕒 {de.tileMenu.record}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            void setFavorite(item.id, !item.favorite);
            onClose();
          }}
        >
          {item.favorite ? `☆ ${de.tileMenu.favoriteRemove}` : `★ ${de.tileMenu.favoriteAdd}`}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => navigate(`/history?item=${item.id}`)}
        >
          🕓 {de.tileMenu.history}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => navigate(`/items/${item.id}`)}
        >
          ✏️ {de.tileMenu.edit}
        </button>
      </div>
    </BottomSheet>
  );
}
