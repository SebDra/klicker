import { useId, type InputHTMLAttributes } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** Zeigt einen Zeichenzähler „n / max“ und begrenzt die Eingabe. */
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
  required?: boolean;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  className?: string;
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  maxLength,
  multiline,
  placeholder,
  required,
  inputMode,
  className,
}: Props) {
  const id = useId();
  const msgId = `${id}-msg`;
  const common = {
    id,
    className: `input${error ? ' invalid' : ''}`,
    value,
    placeholder,
    maxLength,
    required,
    'aria-invalid': !!error || undefined,
    'aria-describedby': error || hint ? msgId : undefined,
  };

  return (
    <div className={`field ${className ?? ''}`}>
      <div className="field-label">
        <label htmlFor={id}>{label}</label>
        {maxLength !== undefined && (
          <span className="counter" aria-hidden>
            {value.length} / {maxLength}
          </span>
        )}
      </div>
      {multiline ? (
        <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...common}
          type="text"
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {(error || hint) && (
        <small id={msgId} className={error ? 'error' : 'hint'}>
          {error ?? hint}
        </small>
      )}
    </div>
  );
}
