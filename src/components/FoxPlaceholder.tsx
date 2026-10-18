export type FoxState = "idle" | "reading" | "celebrating" | "waving";

const LABEL: Record<FoxState, string> = {
  idle: "Fox",
  reading: "Fox reading",
  celebrating: "Fox celebrating",
  waving: "Fox waving",
};

interface Props {
  state?: FoxState;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

/** Placeholder for the fox mascot; real art drops in here later. */
export function FoxPlaceholder({ state = "idle", size = "md", label, className }: Props) {
  const text = label ?? LABEL[state];
  return (
    <div
      className={`fox fox--${size}${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={text}
    >
      <span aria-hidden="true">{text}</span>
    </div>
  );
}
