import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../app/Layout';
import { EChart } from '../../components/EChart';
import { Switch } from '../../components/Switch';
import { db } from '../../db/db';
import type { Item } from '../../db/types';
import {
  assignColors,
  bucketLabelLong,
  buildChart,
  COUNT_UNIT,
  GRANULARITIES,
  makeBuckets,
  MAX_SERIES,
  presetRange,
  RANGE_PRESETS,
  rangeToTimes,
  seriesDefs,
  suggestGranularity,
  type ChartPanel,
  type DateRange,
  type Granularity,
  type RangePreset,
} from '../../domain/chart';
import { displayName } from '../../domain/item';
import { useColorScheme } from '../../hooks/useColorScheme';
import { de } from '../../i18n/de';
import { buildOption, formatPoint } from './chartOption';
import { defaultSettings, loadSettings, saveSettings, type ChartSettings } from './chartSettings';
import { SERIES_COLORS } from './palette';

export function ChartPage() {
  const items = useLiveQuery(() => db.items.orderBy('sortOrder').toArray(), []);
  const [settings, setSettings] = useState<ChartSettings | null>(
    () => loadSettings(Date.now()) ?? null,
  );

  // Erster Aufruf ohne gespeicherte Auswahl: Favoriten vorauswählen.
  useEffect(() => {
    if (settings || !items) return;
    const favs = items.filter((i) => i.favorite && !i.archived).map((i) => i.id);
    const ids = seriesDefs(items.filter((i) => favs.includes(i.id))).map((d) => d.id);
    setSettings({ ...defaultSettings(Date.now(), favs), colors: assignColors(ids, {}) });
  }, [settings, items]);

  useEffect(() => {
    if (settings) saveSettings(settings);
  }, [settings]);

  if (!items || !settings) return <Page title={de.nav.chart}>{null}</Page>;

  if (items.length === 0)
    return (
      <Page title={de.nav.chart}>
        <div className="empty-state">
          <p>{de.chart.noItems}</p>
          <Link to="/items/new" className="btn primary">
            {de.dashboard.createFirst}
          </Link>
        </div>
      </Page>
    );

  return <ChartView items={items} settings={settings} onChange={setSettings} />;
}

function ChartView({
  items,
  settings,
  onChange,
}: {
  items: Item[];
  settings: ChartSettings;
  onChange: (s: ChartSettings) => void;
}) {
  const scheme = useColorScheme();
  const fromId = useId();
  const toId = useId();

  // Stabile Objekte, damit Diagramme nur bei echten Änderungen neu gezeichnet werden.
  const selected = useMemo(
    () => items.filter((i) => settings.itemIds.includes(i.id)),
    [items, settings.itemIds],
  );
  const times = useMemo(() => rangeToTimes(settings.range), [settings.range]);
  const buckets = useMemo(
    () => (times ? makeBuckets(times.start, times.end, settings.granularity) : undefined),
    [times, settings.granularity],
  );

  const entries = useLiveQuery(async () => {
    if (!times || selected.length === 0) return [];
    const lists = await Promise.all(
      selected.map((i) =>
        db.entries
          .where('[itemId+timestamp]')
          .between([i.id, times.start], [i.id, times.end], true, false)
          .toArray(),
      ),
    );
    return lists.flat();
  }, [selected, times]);

  const chart = useMemo(
    () =>
      buckets && entries && times ? buildChart(selected, entries, buckets, times.end) : undefined,
    [selected, entries, buckets, times],
  );

  const colors = useMemo(() => {
    const slots = assignColors(
      seriesDefs(selected).map((d) => d.id),
      settings.colors,
    );
    return Object.fromEntries(
      Object.entries(slots).map(([id, slot]) => [id, SERIES_COLORS[scheme][slot]!]),
    );
  }, [selected, settings.colors, scheme]);

  const update = (patch: Partial<ChartSettings>) => onChange({ ...settings, ...patch });

  function toggleItem(id: string) {
    const itemIds = settings.itemIds.includes(id)
      ? settings.itemIds.filter((x) => x !== id)
      : [...settings.itemIds, id];
    const ids = seriesDefs(items.filter((i) => itemIds.includes(i.id))).map((d) => d.id);
    update({ itemIds, colors: { ...settings.colors, ...assignColors(ids, settings.colors) } });
  }

  function setRange(preset: RangePreset, range: DateRange) {
    let granularity = settings.granularity;
    const t = rangeToTimes(range);
    // Vorgaben bekommen die passende Einteilung; eigene Zeiträume nur, wenn die bisherige nicht passt.
    if (preset !== 'custom' || (t && !makeBuckets(t.start, t.end, granularity)))
      granularity = suggestGranularity(range);
    update({ preset, range, granularity });
  }

  const hasValues = selected.some((i) => i.type === 'value');

  return (
    <Page title={de.nav.chart}>
      <div className="chart-controls">
        <fieldset className="field">
          <legend className="field-label">{de.chart.items}</legend>
          <div className="chips">
            {items
              .filter((i) => !i.archived || settings.itemIds.includes(i.id))
              .map((i) => {
                const on = settings.itemIds.includes(i.id);
                return (
                  <button
                    key={i.id}
                    type="button"
                    className="chip"
                    aria-pressed={on}
                    onClick={() => toggleItem(i.id)}
                  >
                    {i.icon} {displayName(i)}
                  </button>
                );
              })}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field-label">{de.chart.range}</legend>
          <div className="segmented" role="radiogroup" aria-label={de.chart.range}>
            {([...RANGE_PRESETS, 'custom'] as RangePreset[]).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={settings.preset === p}
                aria-label={de.chart.presetsLong[p]}
                onClick={() =>
                  p === 'custom'
                    ? update({ preset: 'custom' })
                    : setRange(p, presetRange(p, Date.now()))
                }
              >
                {de.chart.presets[p]}
              </button>
            ))}
          </div>
          {settings.preset === 'custom' && (
            <div className="grid-2">
              <div className="field">
                <label className="field-label" htmlFor={fromId}>
                  {de.chart.from}
                </label>
                <input
                  id={fromId}
                  type="date"
                  className="input"
                  value={settings.range.from}
                  max={settings.range.to}
                  onChange={(e) => setRange('custom', { ...settings.range, from: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor={toId}>
                  {de.chart.to}
                </label>
                <input
                  id={toId}
                  type="date"
                  className="input"
                  value={settings.range.to}
                  min={settings.range.from}
                  onChange={(e) => setRange('custom', { ...settings.range, to: e.target.value })}
                />
              </div>
            </div>
          )}
          {!times && <small className="error">{de.chart.invalidRange}</small>}
        </fieldset>

        <fieldset className="field">
          <legend className="field-label">{de.chart.granularity}</legend>
          <div className="segmented" role="radiogroup" aria-label={de.chart.granularity}>
            {GRANULARITIES.map((g: Granularity) => {
              const possible = !!times && !!makeBuckets(times.start, times.end, g);
              return (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={settings.granularity === g}
                  disabled={!possible}
                  title={possible ? undefined : de.chart.tooMany}
                  onClick={() => update({ granularity: g })}
                >
                  {de.chart.granularities[g]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="card stack">
          {hasValues && (
            <Switch
              label={de.chart.showMinMax}
              hint={de.chart.showMinMaxHint}
              checked={settings.showMinMax}
              onChange={(showMinMax) => update({ showMinMax })}
            />
          )}
          <Switch
            label={de.chart.showTable}
            checked={settings.showTable}
            onChange={(showTable) => update({ showTable })}
          />
        </div>
      </div>

      {selected.length === 0 && <p className="hint center">{de.chart.pick}</p>}
      {chart?.truncated && <p className="hint">{de.chart.truncated(MAX_SERIES)}</p>}

      {chart &&
        buckets &&
        chart.panels.map((panel) => (
          <Panel
            key={panel.unit}
            panel={panel}
            buckets={buckets}
            granularity={settings.granularity}
            colors={colors}
            scheme={scheme}
            showMinMax={settings.showMinMax}
            showTable={settings.showTable}
          />
        ))}
    </Page>
  );
}

function Panel({
  panel,
  buckets,
  granularity,
  colors,
  scheme,
  showMinMax,
  showTable,
}: {
  panel: ChartPanel;
  buckets: number[];
  granularity: Granularity;
  colors: Record<string, string>;
  scheme: 'light' | 'dark';
  showMinMax: boolean;
  showTable: boolean;
}) {
  const option = useMemo(
    () => buildOption({ panel, buckets, granularity, colors, scheme, showMinMax }),
    [panel, buckets, granularity, colors, scheme, showMinMax],
  );
  const unitName = panel.unit === COUNT_UNIT ? COUNT_UNIT : panel.unit || de.chart.noUnit;
  const isCount = panel.series.every((s) => s.kind === 'count');
  // Eine Reihe: Titel nennt sie (keine Legende). Mehrere: Titel = Einheit, Legende darunter.
  const single = panel.series.length === 1 ? panel.series[0] : undefined;
  const title = single ? single.name : unitName;
  const per = de.chart.per[granularity];
  const subtitle = isCount
    ? `${COUNT_UNIT} ${per}`
    : `${single ? `${unitName} · ` : ''}${de.chart.mean} ${per}`;
  const empty = panel.series.every((s) => s.n.every((x) => x === 0));
  const names = panel.series.map((s) => s.name).join(', ');
  const rows = buckets
    .map((b, i) => ({ b, i }))
    .filter(({ i }) => panel.series.some((s) => s.n[i]! > 0));

  return (
    <section className="card chart-panel" aria-label={title}>
      <h2 className="dash-title">
        {title} <small>· {subtitle}</small>
      </h2>
      {panel.series.length > 1 && (
        <ul className="chart-legend">
          {panel.series.map((s) => (
            <li key={s.id}>
              <span
                className={`swatch ${s.kind === 'count' ? 'bar' : 'line'}`}
                style={{ background: colors[s.id] }}
                aria-hidden
              />
              {s.name}
            </li>
          ))}
        </ul>
      )}
      {empty ? (
        <p className="hint center">{de.chart.noData}</p>
      ) : (
        <EChart option={option} ariaLabel={de.chart.chartLabel(unitName, names)} />
      )}
      {showTable && !empty && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{de.chart.period}</th>
                {panel.series.map((s) => (
                  <th key={s.id} scope="col">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ b, i }) => (
                <tr key={b}>
                  <th scope="row">{bucketLabelLong(b, granularity)}</th>
                  {panel.series.map((s) => (
                    <td key={s.id}>{formatPoint(s, i, showMinMax)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
