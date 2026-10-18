import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

export function Checkbox({ label, id, ...rest }: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <label className="checkbox" htmlFor={fieldId}>
      <input id={fieldId} type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}
