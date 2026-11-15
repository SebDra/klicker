import { useId, useState, type FormEvent } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { TextField } from '../../components/TextField';
import { addEntry } from '../../db/entryRepository';
import { LIMITS, type Entry, type Item } from '../../db/types';
import {
  emptyEntryForm,
  entryFormToData,
  hasEntryErrors,
  validateEntryForm,
  type EntryForm,
} from '../../domain/entry';
import { displayName } from '../../domain/item';
import { formatDecimal } from '../../domain/number';
import { toDateTimeLocal } from '../../domain/time';
import { de } from '../../i18n/de';

interface Props {
  item: Item;
  /** Letzter Eintrag – seine Werte erscheinen als Platzhalter. */
  lastEntry?: Entry;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
}

/** Erfassung mit Werten, Zeitpunkt (rückdatierbar) und Notiz. */
export function EntrySheet({ item, lastEntry, onClose, onSaved }: Props) {
  const [form, setForm] = useState<EntryForm>(() => emptyEntryForm(Date.now()));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const whenId = useId();

  const errors = validateEntryForm(item, form, Date.now());
  const shown = submitted ? errors : {};
  const setValue = (key: string, v: string) =>
    setForm((f) => ({ ...f, values: { ...f.values, [key]: v } }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (hasEntryErrors(errors) || saving) return;
    setSaving(true);
    try {
      const now = Date.now();
      const entry = await addEntry({ itemId: item.id, ...entryFormToData(item, form, now) });
      navigator.vibrate?.(15);
      onSaved(entry);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open title={`${item.icon} ${displayName(item)}`} onClose={onClose}>
      <form className="form" onSubmit={onSubmit} noValidate>
        {item.fields.map((f, idx) => {
          const last = lastEntry?.values?.[f.key];
          return (
            <TextField
              key={f.key}
              label={f.unit ? `${f.name} (${f.unit})` : f.name}
              value={form.values[f.key] ?? ''}
              inputMode="decimal"
              autoFocus={idx === 0}
              placeholder={last !== undefined ? formatDecimal(last, f.decimals) : undefined}
              error={shown.values?.[f.key]}
              onChange={(v) => setValue(f.key, v)}
            />
          );
        })}

        <div className="field">
          <div className="field-label">
            <label htmlFor={whenId}>{de.entry.when}</label>
          </div>
          <div className="row">
            <input
              id={whenId}
              type="datetime-local"
              className={`input${shown.when ? ' invalid' : ''}`}
              value={form.when}
              max={toDateTimeLocal(Date.now())}
              aria-invalid={!!shown.when || undefined}
              onChange={(e) => setForm((f) => ({ ...f, when: e.target.value }))}
            />
            <button
              type="button"
              className="btn secondary"
              onClick={() => setForm((f) => ({ ...f, when: toDateTimeLocal(Date.now()) }))}
            >
              {de.entry.now}
            </button>
          </div>
          {shown.when && <small className="error">{shown.when}</small>}
        </div>

        <TextField
          label={de.entry.note}
          value={form.note}
          multiline
          maxLength={LIMITS.note}
          placeholder={de.entry.notePlaceholder}
          error={shown.note}
          onChange={(note) => setForm((f) => ({ ...f, note }))}
        />

        {shown.form && (
          <small className="error" role="alert">
            {shown.form}
          </small>
        )}
        <button type="submit" className="btn primary block" disabled={saving}>
          {de.entry.save}
        </button>
      </form>
    </BottomSheet>
  );
}
