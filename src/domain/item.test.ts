import type { Item } from '../db/types';
import {
  displayName,
  emptyForm,
  firstGrapheme,
  formToDraft,
  hasErrors,
  itemToForm,
  newField,
  validateForm,
  type ItemForm,
} from './item';

const form = (patch: Partial<ItemForm> = {}): ItemForm => ({
  ...emptyForm(),
  name: 'Wasser',
  ...patch,
});

describe('displayName', () => {
  it('nimmt das Label, wenn vorhanden', () => {
    expect(displayName({ name: 'Glas Wasser getrunken', label: 'Wasser' })).toBe('Wasser');
  });
  it('fällt auf den Bezeichner zurück', () => {
    expect(displayName({ name: 'Glas Wasser', label: '  ' })).toBe('Glas Wasser');
    expect(displayName({ name: 'Glas Wasser' })).toBe('Glas Wasser');
  });
});

describe('validateForm', () => {
  it('akzeptiert ein einfaches Zähler-Item', () => {
    expect(hasErrors(validateForm(form()))).toBe(false);
  });

  it('verlangt einen Bezeichner', () => {
    expect(validateForm(form({ name: '   ' })).name).toBeDefined();
  });

  it('prüft die Längen von Bezeichner und Label', () => {
    expect(validateForm(form({ name: 'x'.repeat(60) })).name).toBeUndefined();
    expect(validateForm(form({ name: 'x'.repeat(61) })).name).toBeDefined();
    expect(validateForm(form({ label: 'x'.repeat(20) })).label).toBeUndefined();
    expect(validateForm(form({ label: 'x'.repeat(21) })).label).toBeDefined();
  });

  it('verlangt mindestens ein Feld bei Wert-Items', () => {
    expect(validateForm(form({ type: 'value' })).fields).toBeDefined();
  });

  it('prüft Feldnamen, Zahlen und Min ≤ Max', () => {
    const e = validateForm(
      form({
        type: 'value',
        fields: [
          newField({ name: '' }),
          newField({ name: 'Gewicht', min: 'abc' }),
          newField({ name: 'Puls', min: '100', max: '50' }),
        ],
      }),
    );
    expect(e.fieldErrors?.[0]?.name).toBeDefined();
    expect(e.fieldErrors?.[1]?.min).toBeDefined();
    expect(e.fieldErrors?.[2]?.max).toBeDefined();
  });

  it('erkennt doppelte Feldnamen', () => {
    const e = validateForm(
      form({ type: 'value', fields: [newField({ name: 'Puls' }), newField({ name: 'puls' })] }),
    );
    expect(e.fieldErrors?.[1]?.name).toBeDefined();
  });

  it('ignoriert Felder, solange der Typ Zähler ist', () => {
    const e = validateForm(form({ type: 'counter', fields: [newField({ name: '' })] }));
    expect(hasErrors(e)).toBe(false);
  });
});

describe('formToDraft / itemToForm', () => {
  it('trimmt Texte und entfernt leere optionale Werte', () => {
    const d = formToDraft(form({ name: '  Wasser ', label: ' ', memo: '' }));
    expect(d.name).toBe('Wasser');
    expect(d.label).toBeUndefined();
    expect(d.memo).toBeUndefined();
  });

  it('verwirft Felder bei Zähler-Items', () => {
    const d = formToDraft(form({ type: 'counter', fields: [newField({ name: 'X' })] }));
    expect(d.fields).toEqual([]);
  });

  it('wandelt Zahlen mit Komma um und bleibt beim Rückweg stabil', () => {
    const f = newField({ name: 'Gewicht', unit: 'kg', min: '1,5', max: '', decimals: 1 });
    const d = formToDraft(form({ type: 'value', fields: [f] }));
    expect(d.fields[0]).toEqual({
      key: f.key,
      name: 'Gewicht',
      unit: 'kg',
      min: 1.5,
      max: undefined,
      decimals: 1,
    });

    const item: Item = {
      ...d,
      id: 'x',
      sortOrder: 1,
      archived: false,
      createdAt: 0,
      updatedAt: 0,
    };
    expect(itemToForm(item).fields[0]).toMatchObject({ min: '1,5', max: '', unit: 'kg' });
  });
});

describe('firstGrapheme', () => {
  it('liefert zusammengesetzte Emojis vollständig', () => {
    expect(firstGrapheme('👨‍👩‍👧 Familie')).toBe('👨‍👩‍👧');
    expect(firstGrapheme('⚖️')).toBe('⚖️');
    expect(firstGrapheme('  ab')).toBe('a');
    expect(firstGrapheme('')).toBe('');
  });
});
