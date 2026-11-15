import { useId } from 'react';
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, PlusIcon } from '../../app/icons';
import { TextField } from '../../components/TextField';
import { LIMITS } from '../../db/types';
import { FIELD_PRESETS, newField, type FieldForm, type FieldFormErrors } from '../../domain/item';
import { de } from '../../i18n/de';

interface Props {
  fields: FieldForm[];
  errors?: FieldFormErrors[];
  onChange: (fields: FieldForm[]) => void;
  /** Wird aufgerufen, wenn eine Vorlage gewählt wurde (z. B. um das Icon vorzuschlagen). */
  onPreset?: (icon: string, name: string) => void;
}

export function FieldsEditor({ fields, errors, onChange, onPreset }: Props) {
  const update = (idx: number, patch: Partial<FieldForm>) =>
    onChange(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const remove = (idx: number) => onChange(fields.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...fields];
    const [f] = next.splice(idx, 1);
    next.splice(idx + dir, 0, f!);
    onChange(next);
  };

  return (
    <div className="fields-editor">
      {fields.length === 0 && (
        <div className="presets">
          <span className="hint">{de.itemForm.presets}</span>
          {FIELD_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="chip"
              onClick={() => {
                onChange(p.fields());
                onPreset?.(p.icon, p.name);
              }}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      )}

      {fields.map((f, idx) => {
        const fe = errors?.[idx] ?? {};
        const label = f.name.trim() || `${de.itemForm.fieldName} ${idx + 1}`;
        return (
          <fieldset key={f.key} className="card field-card">
            <legend className="sr-only">{label}</legend>
            <div className="field-card-head">
              <strong>{label}</strong>
              <span className="spacer" />
              <button
                type="button"
                className="icon-btn"
                aria-label={`${label}: ${de.common.moveUp}`}
                disabled={idx === 0}
                onClick={() => move(idx, -1)}
              >
                <ArrowUpIcon />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`${label}: ${de.common.moveDown}`}
                disabled={idx === fields.length - 1}
                onClick={() => move(idx, 1)}
              >
                <ArrowDownIcon />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`${label}: ${de.common.remove}`}
                onClick={() => remove(idx)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="grid-2">
              <TextField
                label={de.itemForm.fieldName}
                value={f.name}
                maxLength={LIMITS.fieldName}
                error={fe.name}
                onChange={(name) => update(idx, { name })}
              />
              <TextField
                label={de.itemForm.fieldUnit}
                value={f.unit}
                maxLength={LIMITS.unit}
                error={fe.unit}
                placeholder="kg, mmHg …"
                onChange={(unit) => update(idx, { unit })}
              />
              <TextField
                label={de.itemForm.fieldMin}
                value={f.min}
                inputMode="decimal"
                error={fe.min}
                onChange={(min) => update(idx, { min })}
              />
              <TextField
                label={de.itemForm.fieldMax}
                value={f.max}
                inputMode="decimal"
                error={fe.max}
                onChange={(max) => update(idx, { max })}
              />
            </div>
            <DecimalsSelect value={f.decimals} onChange={(decimals) => update(idx, { decimals })} />
          </fieldset>
        );
      })}

      {fields.length < LIMITS.maxFields && (
        <button
          type="button"
          className="btn secondary"
          onClick={() => onChange([...fields, newField()])}
        >
          <PlusIcon /> {de.itemForm.addField}
        </button>
      )}
    </div>
  );
}

function DecimalsSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className="field inline">
      <label htmlFor={id}>{de.itemForm.fieldDecimals}</label>
      <select
        id={id}
        className="input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {Array.from({ length: LIMITS.maxDecimals + 1 }, (_, n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}
