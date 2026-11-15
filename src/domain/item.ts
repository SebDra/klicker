import { newId } from '../db/id';
import { LIMITS, type Item, type ItemDraft, type ItemType } from '../db/types';
import { parseDecimal, toInputString } from './number';

/** Anzeigename auf Kacheln: Label, sonst Bezeichner. */
export function displayName(item: Pick<Item, 'name' | 'label'>): string {
  return item.label?.trim() || item.name;
}

// ---------- Formularzustand (Zahlen als Text, damit Zwischenstände wie „12,“ möglich sind) ----------

export interface FieldForm {
  key: string;
  name: string;
  unit: string;
  min: string;
  max: string;
  decimals: number;
}

export interface ItemForm {
  name: string;
  label: string;
  memo: string;
  icon: string;
  type: ItemType;
  fields: FieldForm[];
  dailyReset: boolean;
  favorite: boolean;
}

export interface FieldFormErrors {
  name?: string;
  unit?: string;
  min?: string;
  max?: string;
}

export interface ItemFormErrors {
  name?: string;
  label?: string;
  memo?: string;
  icon?: string;
  fields?: string;
  fieldErrors?: FieldFormErrors[];
}

export const DEFAULT_ICON = '⭐';

export function emptyForm(): ItemForm {
  return {
    name: '',
    label: '',
    memo: '',
    icon: DEFAULT_ICON,
    type: 'counter',
    fields: [],
    dailyReset: true,
    favorite: false,
  };
}

export function newField(partial: Partial<Omit<FieldForm, 'key'>> = {}): FieldForm {
  return {
    key: newId().slice(0, 8),
    name: '',
    unit: '',
    min: '',
    max: '',
    decimals: 0,
    ...partial,
  };
}

/** Vorlagen für häufige Messwerte. */
export const FIELD_PRESETS: { name: string; icon: string; fields: () => FieldForm[] }[] = [
  {
    name: 'Blutdruck',
    icon: '🩺',
    fields: () => [
      newField({ name: 'Systole', unit: 'mmHg', min: '50', max: '260' }),
      newField({ name: 'Diastole', unit: 'mmHg', min: '30', max: '160' }),
      newField({ name: 'Puls', unit: 'bpm', min: '30', max: '220' }),
    ],
  },
  {
    name: 'Gewicht',
    icon: '⚖️',
    fields: () => [newField({ name: 'Gewicht', unit: 'kg', min: '1', max: '400', decimals: 1 })],
  },
  {
    name: 'Temperatur',
    icon: '🌡️',
    fields: () => [newField({ name: 'Temperatur', unit: '°C', min: '34', max: '43', decimals: 1 })],
  },
];

export function itemToForm(item: Item): ItemForm {
  return {
    name: item.name,
    label: item.label ?? '',
    memo: item.memo ?? '',
    icon: item.icon,
    type: item.type,
    fields: item.fields.map((f) => ({
      key: f.key,
      name: f.name,
      unit: f.unit ?? '',
      min: toInputString(f.min),
      max: toInputString(f.max),
      decimals: f.decimals,
    })),
    dailyReset: item.dailyReset,
    favorite: item.favorite,
  };
}

export function validateForm(form: ItemForm): ItemFormErrors {
  const e: ItemFormErrors = {};
  const name = form.name.trim();
  if (!name) e.name = 'Bitte einen Bezeichner eingeben.';
  else if (name.length > LIMITS.name) e.name = `Höchstens ${LIMITS.name} Zeichen.`;
  if (form.label.trim().length > LIMITS.label) e.label = `Höchstens ${LIMITS.label} Zeichen.`;
  if (form.memo.trim().length > LIMITS.memo) e.memo = `Höchstens ${LIMITS.memo} Zeichen.`;
  if (!form.icon.trim()) e.icon = 'Bitte ein Icon wählen.';

  if (form.type === 'value') {
    if (form.fields.length === 0) e.fields = 'Mindestens ein Wertfeld anlegen.';
    else if (form.fields.length > LIMITS.maxFields)
      e.fields = `Höchstens ${LIMITS.maxFields} Wertfelder.`;

    const fieldErrors = form.fields.map((f) => {
      const fe: FieldFormErrors = {};
      const fname = f.name.trim();
      if (!fname) fe.name = 'Name fehlt.';
      else if (fname.length > LIMITS.fieldName) fe.name = `Höchstens ${LIMITS.fieldName} Zeichen.`;
      if (f.unit.trim().length > LIMITS.unit) fe.unit = `Höchstens ${LIMITS.unit} Zeichen.`;
      const min = parseDecimal(f.min);
      const max = parseDecimal(f.max);
      if (Number.isNaN(min)) fe.min = 'Keine gültige Zahl.';
      if (Number.isNaN(max)) fe.max = 'Keine gültige Zahl.';
      if (min !== undefined && max !== undefined && !fe.min && !fe.max && min > max)
        fe.max = 'Max muss ≥ Min sein.';
      return fe;
    });
    const names = form.fields.map((f) => f.name.trim().toLowerCase());
    names.forEach((n, i) => {
      if (n && names.indexOf(n) !== i) fieldErrors[i]!.name ??= 'Name doppelt vergeben.';
    });
    if (fieldErrors.some((fe) => Object.keys(fe).length > 0)) e.fieldErrors = fieldErrors;
  }
  return e;
}

export function hasErrors(e: ItemFormErrors): boolean {
  return Object.keys(e).length > 0;
}

/** Wandelt ein gültiges Formular in die zu speichernden Daten um. */
export function formToDraft(form: ItemForm): ItemDraft {
  const opt = (s: string) => (s.trim() === '' ? undefined : s.trim());
  return {
    name: form.name.trim(),
    label: opt(form.label),
    memo: opt(form.memo),
    icon: form.icon.trim(),
    type: form.type,
    fields:
      form.type === 'value'
        ? form.fields.map((f) => ({
            key: f.key,
            name: f.name.trim(),
            unit: opt(f.unit),
            min: parseDecimal(f.min),
            max: parseDecimal(f.max),
            decimals: Math.min(Math.max(f.decimals, 0), LIMITS.maxDecimals),
          }))
        : [],
    dailyReset: form.dailyReset,
    favorite: form.favorite,
  };
}

/** Erstes sichtbares Zeichen (Graphem) – Emojis bestehen oft aus mehreren Codepoints. */
export function firstGrapheme(input: string): string {
  const s = input.trim();
  if (!s) return '';
  if (typeof Intl.Segmenter === 'function') {
    const seg = new Intl.Segmenter('de', { granularity: 'grapheme' });
    for (const { segment } of seg.segment(s)) return segment;
  }
  return Array.from(s)[0] ?? '';
}
