import { useId, type SelectHTMLAttributes } from "react";
import { Field } from "./Field";

interface Option {
  value: string;
  label: string;
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  help?: string;
  error?: string;
  options: Option[];
}

export function Select({ label, help, error, options, id, ...rest }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Field label={label} help={help} error={error} htmlFor={fieldId}>
      <select
        id={fieldId}
        className="select"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : help ? `${fieldId}-help` : undefined}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
