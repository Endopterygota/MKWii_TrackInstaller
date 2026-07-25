import type { ChangeEventHandler, ReactNode } from "react";

type FieldProps = {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: ReactNode;
  readOnly?: boolean;
  options?: string[];
  emptyOptionLabel?: string;
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
  action?: ReactNode;
};

export function Field({ label, value, hint, icon, readOnly, options, emptyOptionLabel = "Keine SZS-Datei gefunden", onChange, action }: FieldProps) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="field__control">
        {icon && <span className="field__icon">{icon}</span>}
        {options ? (
          <select value={value} onChange={onChange} disabled={readOnly}>
            {options.length === 0 && <option value="">{emptyOptionLabel}</option>}
            {options.map((option) => <option value={option} key={option}>{option}</option>)}
          </select>
        ) : (
          <input value={value} readOnly={readOnly} onChange={onChange} />
        )}
        {action}
      </span>
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}
