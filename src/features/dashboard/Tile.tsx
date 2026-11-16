import type { Item } from '../../db/types';
import { counterValue, type ItemStats } from '../../domain/dashboard';
import { formatValues } from '../../domain/entry';
import { displayName } from '../../domain/item';
import { formatWhen } from '../../domain/time';
import { useLongPress } from '../../hooks/useLongPress';
import { de } from '../../i18n/de';

interface Props {
  item: Item;
  stats: ItemStats;
  now: number;
  onActivate: (item: Item) => void;
  onMenu: (item: Item) => void;
}

export function Tile({ item, stats, now, onActivate, onMenu }: Props) {
  const press = useLongPress(
    () => onMenu(item),
    () => onActivate(item),
  );
  const name = displayName(item);

  let value: string;
  let meta: string;
  if (item.type === 'counter') {
    value = String(counterValue(item, stats));
    meta = item.dailyReset ? de.dashboard.today : de.dashboard.total;
  } else {
    const last = stats.lastEntry;
    value = (last && formatValues(item, last.values)) || '–';
    meta = last ? formatWhen(last.timestamp, now) : de.dashboard.noValue;
  }

  return (
    <button
      type="button"
      className="tile"
      data-type={item.type}
      aria-label={`${name}: ${value} ${meta}`}
      {...press}
    >
      <span className="tile-body">
        <span className="tile-icon" aria-hidden>
          {item.icon}
        </span>
        <span className="tile-name">{name}</span>
        <span className={`tile-value${value.length > 5 ? ' long' : ''}`} aria-hidden>
          {value}
        </span>
        <span className="tile-meta" aria-hidden>
          {meta}
        </span>
      </span>
    </button>
  );
}
