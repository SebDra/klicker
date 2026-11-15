import { useId } from 'react';

interface Props {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Ein/Aus-Schalter mit Beschriftung; die ganze Zeile ist antippbar. */
export function Switch({ label, hint, checked, onChange }: Props) {
  const id = useId();
  return (
    <label className="switch-row" htmlFor={id}>
      <span className="switch-text">
        <span>{label}</span>
        {hint && <small className="hint">{hint}</small>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
