import type { Item } from '../db/types';
import {
  emptyEntryForm,
  entryFormToData,
  formatValues,
  hasEntryErrors,
  validateEntryForm,
  type EntryForm,
} from './entry';
import { toDateTimeLocal } from './time';

const base: Omit<Item, 'type' | 'fields'> = {
  id: 'i',
  name: 'Test',
  icon: '⭐',
  dailyReset: true,
  favorite: false,
  sortOrder: 1,
  archived: false,
  createdAt: 0,
  updatedAt: 0,
};

const counter: Item = { ...base, type: 'counter', fields: [] };
const bp: Item = {
  ...base,
  type: 'value',
  fields: [
    { key: 'sys', name: 'Systole', unit: 'mmHg', min: 50, max: 260, decimals: 0 },
    { key: 'dia', name: 'Diastole', unit: 'mmHg', min: 30, max: 160, decimals: 0 },
    { key: 'pul', name: 'Puls', unit: 'bpm', decimals: 0 },
  ],
};
const weight: Item = {
  ...base,
  type: 'value',
  fields: [{ key: 'w', name: 'Gewicht', unit: 'kg', decimals: 1 }],
};

const now = new Date(2026, 10, 15, 18, 30, 20).getTime();
const form = (patch: Partial<EntryForm> = {}): EntryForm => ({ ...emptyEntryForm(now), ...patch });

describe('validateEntryForm', () => {
  it('Zähler ohne Werte ist gültig', () => {
    expect(hasEntryErrors(validateEntryForm(counter, form(), now))).toBe(false);
  });

  it('verlangt mindestens einen Wert', () => {
    expect(validateEntryForm(bp, form(), now).form).toBeDefined();
    expect(hasEntryErrors(validateEntryForm(bp, form({ values: { sys: '120' } }), now))).toBe(
      false,
    );
  });

  it('prüft Zahlen und Min/Max', () => {
    const e = validateEntryForm(bp, form({ values: { sys: '300', dia: '4x', pul: '70' } }), now);
    expect(e.values?.sys).toMatch(/Höchstens 260/);
    expect(e.values?.dia).toMatch(/gültige Zahl/);
    expect(e.values?.pul).toBeUndefined();
  });

  it('lehnt Zeitpunkte in der Zukunft ab', () => {
    const later = toDateTimeLocal(now + 2 * 3_600_000);
    expect(validateEntryForm(counter, form({ when: later }), now).when).toBeDefined();
    expect(validateEntryForm(counter, form({ when: '' }), now).when).toBeDefined();
  });
});

describe('entryFormToData', () => {
  it('nutzt die exakte Zeit, wenn der Zeitpunkt nicht geändert wurde', () => {
    expect(entryFormToData(counter, form(), now).timestamp).toBe(now);
  });

  it('übernimmt einen rückdatierten Zeitpunkt', () => {
    const d = entryFormToData(counter, form({ when: '2026-11-14T21:00' }), now);
    expect(d.timestamp).toBe(new Date(2026, 10, 14, 21, 0).getTime());
    expect(d.values).toBeUndefined();
  });

  it('rundet auf Nachkommastellen, ignoriert leere Felder, trimmt Notiz', () => {
    const d = entryFormToData(
      weight,
      form({ values: { w: '72,46' }, note: '  nach dem Sport ' }),
      now,
    );
    expect(d.values).toEqual({ w: 72.5 });
    expect(d.note).toBe('nach dem Sport');

    const d2 = entryFormToData(bp, form({ values: { sys: '120', dia: '' } }), now);
    expect(d2.values).toEqual({ sys: 120 });
    expect(d2.note).toBeUndefined();
  });
});

describe('formatValues', () => {
  it('lässt Einheiten weg, wenn sie verschieden sind', () => {
    expect(formatValues(bp, { sys: 120, dia: 80, pul: 65 })).toBe('120 / 80 / 65');
  });
  it('hängt eine gemeinsame Einheit an', () => {
    expect(formatValues(bp, { sys: 120, dia: 80 })).toBe('120 / 80 mmHg');
    expect(formatValues(weight, { w: 72.5 })).toBe('72,5 kg');
  });
  it('leer ohne Werte', () => {
    expect(formatValues(weight, undefined)).toBe('');
    expect(formatValues(weight, {})).toBe('');
  });
});
