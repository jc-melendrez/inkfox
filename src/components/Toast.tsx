import type { ReactNode } from "react";

type Tone = "info" | "success" | "error";

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
      <span>{toast.message}</span>
      <button
        type="button"
        className="toast__close"
        aria-label="Dismiss message"
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
}
