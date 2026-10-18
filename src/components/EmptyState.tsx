import type { ReactNode } from "react";
import { FoxPlaceholder } from "./FoxPlaceholder";

interface Props {
  title: string;
  message?: string;
  children?: ReactNode;
}

export function EmptyState({ title, message, children }: Props) {
  return (
    <div className="empty-state">
      <FoxPlaceholder size="md" />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}
