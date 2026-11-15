import type { ChartPanel, ChartSeries } from '../../domain/chart';
import { buildOption, escapeHtml, formatPoint } from './chartOption';

const series = (patch: Partial<ChartSeries>): ChartSeries => ({
  id: 's',
  name: 'S',
  kind: 'value',
  unit: 'kg',
  decimals: 1,
  values: [72.25, null],
  min: [72, null],
  max: [72.5, null],
  n: [2, 0],
  ...patch,
});

describe('formatPoint', () => {
  it('Zähler ganzzahlig, Messwerte mit Spanne', () => {
    expect(formatPoint(series({ kind: 'count', values: [3, 0], n: [3, 0] }), 0, true)).toBe('3');
    expect(formatPoint(series({}), 0, true)).toBe('72,25 (72,0–72,5)');
    expect(formatPoint(series({}), 0, false)).toBe('72,25');
    expect(formatPoint(series({}), 1, true)).toBe('–');
  });
});

describe('escapeHtml', () => {
  it('maskiert Nutzertexte für den Tooltip', () => {
    expect(escapeHtml('<b>"A" & \'B\'</b>')).toBe(
      '&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;',
    );
  });
});

describe('buildOption', () => {
  const panel: ChartPanel = { unit: 'kg', series: [series({})] };
  const base = {
    buckets: [new Date(2026, 10, 14).getTime(), new Date(2026, 10, 15).getTime()],
    granularity: 'day' as const,
    colors: { s: '#2a78d6' },
    scheme: 'light' as const,
  };

  it('Linie 2px mit Markern und Flächenring, ohne Band', () => {
    const o = buildOption({ ...base, panel, showMinMax: false });
    const s = (o.series as Record<string, unknown>[])[0]!;
    expect(o.series).toHaveLength(1);
    expect(s).toMatchObject({
      type: 'line',
      symbolSize: 8,
      lineStyle: { width: 2, color: '#2a78d6' },
      itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
    });
    expect((o.xAxis as { data: string[] }).data).toEqual(['14.11.', '15.11.']);
  });

  it('Min/Max als gestapeltes Band', () => {
    const o = buildOption({ ...base, panel, showMinMax: true });
    const list = o.series as { id: string; data: unknown[] }[];
    expect(list.map((s) => s.id)).toEqual(['s::band:min', 's::band:range', 's']);
    expect(list[1]!.data[0]).toBeCloseTo(0.5);
    expect(list[1]!.data[1]).toBeNull();
  });

  it('Balken höchstens 24px mit abgerundeter Oberkante', () => {
    const o = buildOption({
      ...base,
      showMinMax: false,
      panel: {
        unit: 'Anzahl',
        series: [series({ kind: 'count', unit: 'Anzahl', values: [1, 0], n: [1, 0] })],
      },
    });
    expect((o.series as Record<string, unknown>[])[0]).toMatchObject({
      type: 'bar',
      barMaxWidth: 24,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    });
    expect(o.yAxis).toMatchObject({ minInterval: 1 });
  });
});
