import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface Props {
  title: string;
  message?: string;
  children?: ReactNode;
  icon?: IconName;
}

export function EmptyState({ title, message, children, icon = "inbox" }: Props) {
  return (
    <div className="empty-state">
      <Icon name={icon} size="lg" className="empty-state__icon" />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}
