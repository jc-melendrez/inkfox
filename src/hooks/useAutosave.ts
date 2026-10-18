import { useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Debounced autosave; reports "saving" / "saved" / "error" for the editor. */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<unknown>,
  delayMs = 800,
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("saving");
    const timer = setTimeout(() => {
      saveRef.current(value)
        .then(() => setStatus("saved"))
        .catch(() => setStatus("error"));
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return status;
}
