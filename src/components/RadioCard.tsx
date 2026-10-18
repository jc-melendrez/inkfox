import type { ReactNode } from "react";

interface Props {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description: string;
  tag?: ReactNode;
}

/** Large, easy-to-hit radio choice (Fitts's Law) used by the method picker. */
export function RadioCard({ name, value, checked, onChange, title, description, tag }: Props) {
  return (
    <label className={`radio-card${checked ? " radio-card--selected" : ""}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      <span className="radio-card__body">
        <span className="radio-card__title">
          {title}
          {tag}
        </span>
        <span className="radio-card__desc">{description}</span>
      </span>
    </label>
  );
}
