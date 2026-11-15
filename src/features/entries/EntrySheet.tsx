import { useId, useState, type FormEvent } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TextField } from '../../components/TextField';
import { addEntry, deleteEntry, updateEntry } from '../../db/entryRepository';
import { LIMITS, type Entry, type Item } from '../../db/types';
import {
  emptyEntryForm,
  entryFormToData,
  entryToForm,
  hasEntryErrors,
  mergeValues,
  validateEntryForm,
  type EntryForm,
} from '../../domain/entry';
import { displayName } from '../../domain/item';
import { formatDecimal } from '../../domain/number';
import { toDateTimeLocal } from '../../domain/time';
import { de } from '../../i18n/de';

interface Props {
  item: Item;
  /** Gesetzt = bestehenden Eintrag bearbeiten, sonst neuen anlegen. */
  entry?: Entry;
  /** Letzter Eintrag – seine Werte erscheinen beim Anlegen als Platzhalter. */
  lastEntry?: Entry;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
  onDeleted?: (entry: Entry) => void;
}

/** Erfassen oder Bearbeiten eines Eintrags: Werte, Zeitpunkt (rückdatierbar) und Notiz. */
export function EntrySheet({ item, entry, lastEntry, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<EntryForm>(() =>
    entry ? entryToForm(item, entry) : emptyEntryForm(Date.now()),
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const whenId = useId();

  const errors = validateEntryForm(item, form, Date.now());
  const shown = submitted ? errors : {};
  const setValue = (key: string, v: string) =>
    setForm((f) => ({ ...f, values: { ...f.values, [key]: v } }));
  const placeholderEntry = entry ? undefined : lastEntry;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (hasEntryErrors(errors) || saving) return;
    setSaving(true);
    try {
      const now = Date.now();
      if (entry) {
        const data = entryFormToData(item, form, now, entry.timestamp);
        const values = mergeValues(item, entry.values, data.values);
        await updateEntry(entry.id, { ...data, values });
        onSaved({ ...entry, ...data, values });
      } else {
        const created = await addEntry({ itemId: item.id, ...entryFormToData(item, form, now) });
        navigator.vibrate?.(15);
        onSaved(created);
      }
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!entry) return;
    await deleteEntry(entry.id);
    setConfirmDelete(false);
    onDeleted?.(entry);
  }

  const title = `${item.icon} ${displayName(item)}`;

  return (
    <>
      <BottomSheet
        open={!confirmDelete}
        title={entry ? `${title} · ${de.entry.editTitle}` : title}
        onClose={onClose}
      >
        <form className="form" onSubmit={onSubmit} noValidate>
          {item.fields.map((f, idx) => {
            const last = placeholderEntry?.values?.[f.key];
            return (
              <TextField
                key={f.key}
                label={f.unit ? `${f.name} (${f.unit})` : f.name}
                value={form.values[f.key] ?? ''}
                inputMode="decimal"
                autoFocus={!entry && idx === 0}
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
          {entry && (
            <button
              type="button"
              className="btn danger-outline block"
              onClick={() => setConfirmDelete(true)}
            >
              {de.entry.delete}
            </button>
          )}
        </form>
      </BottomSheet>

      {entry && (
        <ConfirmDialog
          open={confirmDelete}
          title={de.entry.deleteTitle}
          confirmLabel={de.common.delete}
          danger
          onConfirm={() => void onDelete()}
          onCancel={() => setConfirmDelete(false)}
        >
          <p>{de.entry.deleteText}</p>
        </ConfirmDialog>
      )}
    </>
  );
}
