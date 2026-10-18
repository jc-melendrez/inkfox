import type { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  accent?: boolean;
  children: ReactNode;
}

export function Card({ accent, className, children, ...rest }: Props) {
  const cls = ["card", accent && "card--accent-soft", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
