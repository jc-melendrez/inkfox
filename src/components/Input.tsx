import { useId, type InputHTMLAttributes } from "react";
import { Field } from "./Field";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  help?: string;
  error?: string;
}

export function Input({ label, help, error, id, ...rest }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Field label={label} help={help} error={error} htmlFor={fieldId}>
      <input
        id={fieldId}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : help ? `${fieldId}-help` : undefined}
        {...rest}
      />
    </Field>
  );
}
