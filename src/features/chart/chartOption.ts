import type { ChartOption } from '../../components/EChart';
import {
  bucketLabel,
  bucketLabelLong,
  type ChartPanel,
  type Granularity,
} from '../../domain/chart';
import { formatDecimal } from '../../domain/number';
import { CHART_CHROME, type ColorScheme } from './palette';

const BAND_SUFFIX = '::band';

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/** Wert einer Reihe für Tooltip und Tabelle, z. B. „125 (120–130)“. */
export function formatPoint(
  s: ChartPanel['series'][number],
  i: number,
  withRange: boolean,
): string {
  const v = s.values[i];
  if (v === null || v === undefined) return '–';
  if (s.kind === 'count') return formatDecimal(v, 0);
  // Mittelwert eine Stelle genauer als die Eingabe, sonst verschwinden Unterschiede.
  const avg = formatDecimal(v, s.n[i]! > 1 ? s.decimals + 1 : s.decimals);
  const min = s.min[i];
  const max = s.max[i];
  if (!withRange || s.n[i]! < 2 || min === null || max === null) return avg;
  return `${avg} (${formatDecimal(min!, s.decimals)}–${formatDecimal(max!, s.decimals)})`;
}

interface Params {
  panel: ChartPanel;
  buckets: number[];
  granularity: Granularity;
  colors: Record<string, string>;
  scheme: ColorScheme;
  showMinMax: boolean;
}

export function buildOption({
  panel,
  buckets,
  granularity,
  colors,
  scheme,
  showMinMax,
}: Params): ChartOption {
  const c = CHART_CHROME[scheme];
  const labels = buckets.map((b) => bucketLabel(b, granularity));
  const isCount = panel.series.every((s) => s.kind === 'count');
  const series: NonNullable<ChartOption['series']> = [];

  for (const s of panel.series) {
    const color = colors[s.id] ?? c.muted;
    if (s.kind === 'count') {
      series.push({
        id: s.id,
        name: s.name,
        type: 'bar',
        data: s.values,
        barMaxWidth: 24,
        barGap: '15%',
        itemStyle: { color, borderRadius: [4, 4, 0, 0] },
        emphasis: { disabled: true },
      });
      continue;
    }
    const points = s.values.filter((v) => v !== null).length;
    if (showMinMax) {
      // Min–Max als dezentes Band: unsichtbare Untergrenze + gestapelte Spanne
      const stack = `${s.id}${BAND_SUFFIX}`;
      series.push(
        {
          id: `${s.id}${BAND_SUFFIX}:min`,
          type: 'line',
          data: s.min,
          stack,
          symbol: 'none',
          lineStyle: { opacity: 0 },
          silent: true,
          tooltip: { show: false },
          connectNulls: true,
        },
        {
          id: `${s.id}${BAND_SUFFIX}:range`,
          type: 'line',
          data: s.max.map((mx, i) => (mx === null || s.min[i] === null ? null : mx - s.min[i]!)),
          stack,
          symbol: 'none',
          lineStyle: { opacity: 0 },
          areaStyle: { color, opacity: 0.12 },
          silent: true,
          tooltip: { show: false },
          connectNulls: true,
        },
      );
    }
    series.push({
      id: s.id,
      name: s.name,
      type: 'line',
      data: s.values,
      connectNulls: true,
      showSymbol: points <= 60,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 2, color, cap: 'round', join: 'round' },
      itemStyle: { color, borderColor: c.surface, borderWidth: 2 },
      emphasis: { disabled: true },
    });
  }

  const axisLabel = { color: c.muted, fontSize: 11 };
  return {
    animation: false,
    grid: { left: 4, right: 12, top: 12, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: isCount ? 'shadow' : 'line', lineStyle: { color: c.axis } },
      backgroundColor: c.surface,
      borderColor: c.border,
      textStyle: { color: c.text, fontSize: 13 },
      confine: true,
      formatter: (raw) => {
        const params = Array.isArray(raw) ? raw : [raw];
        const idx = params[0]?.dataIndex ?? 0;
        const rows = panel.series
          .map((s) => {
            const swatch = `<span style="display:inline-block;width:10px;height:10px;border-radius:${s.kind === 'count' ? 2 : 5}px;background:${colors[s.id] ?? c.muted};margin-right:6px"></span>`;
            return `<div>${swatch}${escapeHtml(s.name)}: <b>${formatPoint(s, idx, true)}</b></div>`;
          })
          .join('');
        const title = escapeHtml(bucketLabelLong(buckets[idx]!, granularity));
        return `<div style="color:${c.muted};margin-bottom:4px">${title}</div>${rows}`;
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: isCount,
      axisLine: { lineStyle: { color: c.axis } },
      axisTick: { show: false },
      axisLabel: { ...axisLabel, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      scale: !isCount,
      minInterval: isCount ? 1 : undefined,
      splitLine: { lineStyle: { color: c.grid, width: 1, type: 'solid' } },
      axisLabel: {
        ...axisLabel,
        formatter: (v: number) => formatDecimal(v, Number.isInteger(v) ? 0 : 1),
      },
    },
    series,
  };
}
