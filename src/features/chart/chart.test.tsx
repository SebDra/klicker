import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import type { ChartOption } from '../../components/EChart';
import { db } from '../../db/db';
import { addEntry } from '../../db/entryRepository';
import { createItem } from '../../db/itemRepository';
import { emptyForm, FIELD_PRESETS, formToDraft, type ItemForm } from '../../domain/item';

// jsdom hat kein Canvas: Diagramm durch Platzhalter mit den Reihen ersetzen.
vi.mock('../../components/EChart', () => ({
  EChart: ({ option, ariaLabel }: { option: ChartOption; ariaLabel: string }) => (
    <div role="img" aria-label={ariaLabel}>
      {(option.series as { id: string; data: unknown[] }[])
        .map((s) => `${s.id}=${JSON.stringify(s.data)}`)
        .join(' ')}
    </div>
  ),
}));

beforeAll(async () => {
  // Seite wird per lazy() geladen – vorab importieren, damit der erste Test nicht wartet.
  await import('./ChartPage');
});

beforeEach(async () => {
  localStorage.clear();
  await db.items.clear();
  await db.entries.clear();
});

const make = (patch: Partial<ItemForm>) => createItem(formToDraft({ ...emptyForm(), ...patch }));
const daysAgo = (d: number, h = 12) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, 0, 0, 0);
  return t.getTime();
};

function renderChart() {
  window.location.hash = '#/chart';
  return render(<App />);
}

describe('Diagramm', () => {
  it('wählt Favoriten vor und zeigt Zähler als Anzahl je Tag', async () => {
    const wasser = await make({ name: 'Wasser', favorite: true });
    await make({ name: 'Kaffee' });
    await addEntry({ itemId: wasser.id, timestamp: daysAgo(0) });
    await addEntry({ itemId: wasser.id, timestamp: daysAgo(0, 13) });
    await addEntry({ itemId: wasser.id, timestamp: daysAgo(2) });
    renderChart();

    expect(await screen.findByRole('button', { name: /Wasser/, pressed: true })).toBeVisible();
    expect(screen.getByRole('button', { name: /Kaffee/, pressed: false })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Letzte 30 Tage' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Tage' })).toBeChecked();

    const panel = await screen.findByRole('region', { name: 'Wasser' });
    expect(within(panel).getByRole('heading')).toHaveTextContent('Wasser · Anzahl je Tag');
    const img = within(panel).getByRole('img', { name: 'Diagramm Anzahl: Wasser' });
    // 30 Tage, die letzten drei: vorgestern 1, gestern 0, heute 2
    expect(img.textContent).toMatch(/,1,0,2\]$/);
  });

  it('trennt Einheiten in eigene Diagramme statt zweiter Achse', async () => {
    const user = userEvent.setup();
    const bp = await make({
      name: 'Blutdruck',
      type: 'value',
      fields: FIELD_PRESETS[0]!.fields(),
    });
    const [sys, dia, pul] = (await db.items.get(bp.id))!.fields.map((f) => f.key);
    await addEntry({
      itemId: bp.id,
      timestamp: daysAgo(1),
      values: { [sys!]: 120, [dia!]: 80, [pul!]: 60 },
    });
    renderChart();

    await user.click(await screen.findByRole('button', { name: /Blutdruck/ }));
    const mmhg = await screen.findByRole('region', { name: 'mmHg' });
    expect(within(mmhg).getByText('Blutdruck · Systole')).toBeVisible(); // Legende ab 2 Reihen
    const puls = screen.getByRole('region', { name: 'Blutdruck · Puls' });
    expect(within(puls).getByRole('heading')).toHaveTextContent('bpm · Mittelwert je Tag');

    await user.click(screen.getByRole('switch', { name: /Tabelle anzeigen/ }));
    const table = within(mmhg).getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(2); // Kopf + ein Tag mit Daten
    expect(within(table).getByRole('cell', { name: '120' })).toBeVisible();
  });

  it('wechselt Zeitraum und Einteilung und merkt sich die Auswahl', async () => {
    const user = userEvent.setup();
    await make({ name: 'Wasser', favorite: true });
    const { unmount } = renderChart();

    await user.click(await screen.findByRole('radio', { name: 'Letztes Jahr' }));
    expect(screen.getByRole('radio', { name: 'Monate' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Stunden' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Wochen' }));

    unmount();
    renderChart();
    expect(await screen.findByRole('radio', { name: 'Letztes Jahr' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Wochen' })).toBeChecked();
  });

  it('eigener Zeitraum mit Datumsfeldern', async () => {
    const user = userEvent.setup();
    await make({ name: 'Wasser', favorite: true });
    renderChart();

    await user.click(await screen.findByRole('radio', { name: 'Eigener Zeitraum' }));
    const from = screen.getByLabelText('Von');
    const to = screen.getByLabelText('Bis');
    fireEvent.change(to, { target: { value: '2026-01-02' } });
    fireEvent.change(from, { target: { value: '2026-01-01' } });
    // Passende Einteilung bleibt erhalten, Stunden werden möglich
    expect(screen.getByRole('radio', { name: 'Tage' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Stunden' })).toBeEnabled();

    // Über 400 Tage sind Tage zu fein → automatisch gröber
    fireEvent.change(from, { target: { value: '2024-01-01' } });
    expect(screen.getByRole('radio', { name: 'Monate' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Tage' })).toBeDisabled();

    // Start nach Ende → Hinweis
    fireEvent.change(from, { target: { value: '2026-02-01' } });
    expect(screen.getByText('Das Startdatum muss vor dem Enddatum liegen.')).toBeVisible();
  });
});
