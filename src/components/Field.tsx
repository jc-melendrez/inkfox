import type { ReactNode } from "react";

interface Props {
  label?: string;
  help?: string;
  error?: string;
  htmlFor: string;
  hideLabel?: boolean;
  children: ReactNode;
}

/** Label + help/error wiring shared by Input, Select and Textarea. */
export function Field({ label, help, error, htmlFor, hideLabel, children }: Props) {
  return (
    <div className="field">
      {label && (
        <label
          className={hideLabel ? "visually-hidden" : "field__label"}
          htmlFor={htmlFor}
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="field__error" id={`${htmlFor}-error`}>
          {error}
        </p>
      ) : help ? (
        <p className="field__help" id={`${htmlFor}-help`}>
          {help}
        </p>
      ) : null}
    </div>
  );
}
