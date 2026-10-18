import type { ReactNode } from "react";

interface Props {
  title: string;
  message?: string;
  children?: ReactNode;
}

export function EmptyState({ title, message, children }: Props) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}
