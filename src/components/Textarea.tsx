import { useId, type TextareaHTMLAttributes } from "react";
import { Field } from "./Field";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  help?: string;
  error?: string;
  hideLabel?: boolean;
}

export function Textarea({ label, help, error, hideLabel, id, className, ...rest }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Field label={label} help={help} error={error} htmlFor={fieldId} hideLabel={hideLabel}>
      <textarea
        id={fieldId}
        className={className ? `textarea ${className}` : "textarea"}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : help ? `${fieldId}-help` : undefined}
        {...rest}
      />
    </Field>
  );
}
