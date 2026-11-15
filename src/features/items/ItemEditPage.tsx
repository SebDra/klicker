import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../app/Layout';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmojiPicker } from '../../components/EmojiPicker';
import { Switch } from '../../components/Switch';
import { TextField } from '../../components/TextField';
import { db } from '../../db/db';
import { createItem, deleteItem, setArchived, updateItem } from '../../db/itemRepository';
import { LIMITS, type Item, type ItemType } from '../../db/types';
import {
  DEFAULT_ICON,
  emptyForm,
  formToDraft,
  hasErrors,
  itemToForm,
  validateForm,
  type ItemForm,
} from '../../domain/item';
import { de } from '../../i18n/de';
import { FieldsEditor } from './FieldsEditor';

export function ItemEditPage() {
  const { id } = useParams();
  // undefined = lädt, null = nicht gefunden
  const item = useLiveQuery(async () => (id ? ((await db.items.get(id)) ?? null) : null), [id]);

  if (!id) return <ItemFormView initial={emptyForm()} />;
  if (item === undefined)
    return (
      <Page title={de.items.edit} back="/items">
        {null}
      </Page>
    );
  if (item === null)
    return (
      <Page title={de.items.edit} back="/items">
        <p className="hint center">{de.items.notFound}</p>
      </Page>
    );
  // key: Formular nur einmal pro Item initialisieren, spätere DB-Updates überschreiben Eingaben nicht.
  return <ItemFormView key={item.id} item={item} initial={itemToForm(item)} />;
}

function ItemFormView({ item, initial }: { item?: Item; initial: ItemForm }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const entryCount =
    useLiveQuery(
      () => (item ? db.entries.where('itemId').equals(item.id).count() : 0),
      [item?.id],
    ) ?? 0;
  const typeLocked = !!item && entryCount > 0;

  const errors = validateForm(form);
  const shown = submitted ? errors : {};
  const set = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors(errors) || saving) return;
    setSaving(true);
    try {
      const draft = formToDraft(form);
      if (item) await updateItem(item.id, draft);
      else await createItem(draft);
      navigate('/items');
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive() {
    if (!item) return;
    await setArchived(item.id, !item.archived);
    navigate('/items');
  }

  async function onDelete() {
    if (!item) return;
    await deleteItem(item.id);
    navigate('/items', { replace: true });
  }

  return (
    <Page title={item ? de.items.edit : de.items.new} back="/items">
      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="icon-name">
          <button
            type="button"
            className={`icon-picker-btn${shown.icon ? ' invalid' : ''}`}
            aria-label={`${de.itemForm.changeIcon} (${form.icon})`}
            onClick={() => setPickerOpen(true)}
          >
            {form.icon || '❔'}
          </button>
          <TextField
            className="grow"
            label={de.itemForm.name}
            value={form.name}
            maxLength={LIMITS.name}
            required
            placeholder={de.itemForm.namePlaceholder}
            error={shown.name}
            onChange={(v) => set('name', v)}
          />
        </div>

        <TextField
          label={de.itemForm.label}
          value={form.label}
          maxLength={LIMITS.label}
          placeholder={de.itemForm.labelPlaceholder}
          hint={de.itemForm.labelHint}
          error={shown.label}
          onChange={(v) => set('label', v)}
        />

        <TextField
          label={de.itemForm.memo}
          value={form.memo}
          maxLength={LIMITS.memo}
          multiline
          placeholder={de.itemForm.memoPlaceholder}
          error={shown.memo}
          onChange={(v) => set('memo', v)}
        />

        <fieldset className="field" disabled={typeLocked}>
          <legend className="field-label">{de.itemForm.type}</legend>
          <div className="segmented" role="radiogroup" aria-label={de.itemForm.type}>
            {(['counter', 'value'] as ItemType[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={form.type === t}
                onClick={() => set('type', t)}
              >
                {t === 'counter' ? `➕ ${de.items.typeCounter}` : `🔢 ${de.items.typeValue}`}
              </button>
            ))}
          </div>
          <small className="hint">
            {typeLocked
              ? de.itemForm.typeLocked
              : form.type === 'counter'
                ? de.itemForm.typeCounterHint
                : de.itemForm.typeValueHint}
          </small>
        </fieldset>

        {form.type === 'value' && (
          <section className="field">
            <h2 className="section-title">{de.itemForm.fields}</h2>
            {item && entryCount > 0 && (
              <small className="hint">{de.itemForm.fieldsWithEntries}</small>
            )}
            <FieldsEditor
              fields={form.fields}
              errors={shown.fieldErrors}
              onChange={(fields) => set('fields', fields)}
              onPreset={(icon, name) =>
                setForm((f) => ({
                  ...f,
                  icon: f.icon === DEFAULT_ICON ? icon : f.icon,
                  name: f.name.trim() ? f.name : name,
                }))
              }
            />
            {shown.fields && <small className="error">{shown.fields}</small>}
          </section>
        )}

        <section className="field">
          <h2 className="section-title">{de.itemForm.options}</h2>
          <div className="card stack">
            <Switch
              label={de.itemForm.dailyReset}
              hint={de.itemForm.dailyResetHint}
              checked={form.dailyReset}
              onChange={(v) => set('dailyReset', v)}
            />
            <Switch
              label={de.itemForm.favorite}
              hint={de.itemForm.favoriteHint}
              checked={form.favorite}
              onChange={(v) => set('favorite', v)}
            />
          </div>
        </section>

        {item && (
          <section className="field">
            <h2 className="section-title">{de.itemForm.manage}</h2>
            <div className="card stack">
              <p className="hint">{de.itemForm.entries(entryCount)}</p>
              <button type="button" className="btn secondary" onClick={() => void toggleArchive()}>
                {item.archived ? de.itemForm.restore : de.itemForm.archive}
              </button>
              {!item.archived && <small className="hint">{de.itemForm.archiveHint}</small>}
              <button
                type="button"
                className="btn danger-outline"
                onClick={() => setConfirmDelete(true)}
              >
                {de.common.delete}
              </button>
            </div>
          </section>
        )}

        <div className="form-actions">
          {submitted && hasErrors(errors) && (
            <small className="error" role="alert">
              {de.itemForm.errorsHint}
            </small>
          )}
          <button type="submit" className="btn primary block" disabled={saving}>
            {de.common.save}
          </button>
        </div>
      </form>

      <EmojiPicker
        open={pickerOpen}
        value={form.icon}
        onSelect={(icon) => set('icon', icon)}
        onClose={() => setPickerOpen(false)}
      />

      {item && (
        <ConfirmDialog
          open={confirmDelete}
          title={de.itemForm.deleteTitle}
          confirmLabel={de.itemForm.deleteConfirm}
          danger
          onConfirm={() => void onDelete()}
          onCancel={() => setConfirmDelete(false)}
        >
          <p>{de.itemForm.deleteText(item.name, entryCount)}</p>
        </ConfirmDialog>
      )}
    </Page>
  );
}
