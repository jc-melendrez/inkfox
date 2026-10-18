import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

interface Props {
  tone?: Tone;
  children: ReactNode;
}

export function Tag({ tone = "neutral", children }: Props) {
  return <span className={`tag${tone !== "neutral" ? ` tag--${tone}` : ""}`}>{children}</span>;
}
