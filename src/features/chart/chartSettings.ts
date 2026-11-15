import {
  GRANULARITIES,
  presetRange,
  RANGE_PRESETS,
  suggestGranularity,
  type DateRange,
  type Granularity,
  type RangePreset,
} from '../../domain/chart';

export interface ChartSettings {
  itemIds: string[];
  preset: RangePreset;
  range: DateRange;
  granularity: Granularity;
  showMinMax: boolean;
  showTable: boolean;
  /** Reihen-ID → Farbplatz; bleibt über Sitzungen stabil */
  colors: Record<string, number>;
}

const KEY = 'klicker.chart.v1';

export function defaultSettings(now: number, itemIds: string[] = []): ChartSettings {
  const range = presetRange('30d', now);
  return {
    itemIds,
    preset: '30d',
    range,
    granularity: suggestGranularity(range),
    showMinMax: false,
    showTable: false,
    colors: {},
  };
}

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Liest die letzte Auswahl. Relative Zeiträume (z. B. 30 Tage) werden auf heute
 * fortgeschrieben. Ungültige oder fehlende Daten → Standardwerte.
 */
export function loadSettings(now: number): ChartSettings | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return undefined;
  }
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<ChartSettings>;
  const base = defaultSettings(now);

  const preset: RangePreset =
    r.preset === 'custom' || RANGE_PRESETS.includes(r.preset as never) ? r.preset! : base.preset;
  const range =
    preset === 'custom'
      ? isDate(r.range?.from) && isDate(r.range?.to)
        ? { from: r.range.from, to: r.range.to }
        : base.range
      : presetRange(preset, now);

  return {
    itemIds: Array.isArray(r.itemIds) ? r.itemIds.filter((x) => typeof x === 'string') : [],
    preset,
    range,
    granularity: GRANULARITIES.includes(r.granularity as Granularity)
      ? r.granularity!
      : suggestGranularity(range),
    showMinMax: r.showMinMax === true,
    showTable: r.showTable === true,
    colors:
      r.colors && typeof r.colors === 'object'
        ? Object.fromEntries(
            Object.entries(r.colors).filter(([, v]) => Number.isInteger(v) && v >= 0),
          )
        : {},
  };
}

export function saveSettings(settings: ChartSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Speicher voll oder gesperrt (privater Modus) – Auswahl gilt dann nur für diese Sitzung.
  }
}
