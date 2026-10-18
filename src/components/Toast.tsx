import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Tone = "info" | "success" | "error";

const TONE_ICON: Record<Tone, IconName> = {
  info: "info",
  success: "success",
  error: "error",
};

export interface ToastItem {
  id: number;
  message: ReactNode;
  tone: Tone;
}

interface Props {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}

export function Toast({ toast, onDismiss }: Props) {
  return (
    <div className={`toast toast--${toast.tone}`} role="status">
      <Icon name={TONE_ICON[toast.tone]} size="sm" className="toast__icon" />
      <span>{toast.message}</span>
      <button
        type="button"
        className="toast__close"
        aria-label="Dismiss message"
        onClick={() => onDismiss(toast.id)}
      >
        <Icon name="close" size="sm" />
      </button>
    </div>
  );
}
