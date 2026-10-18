import { useEffect, useState } from "react";

/** Optional, non-stressful count-down. Nothing alarming happens at zero. */
export function useTimer(minutes: number, initiallyRunning = false) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(initiallyRunning);

  useEffect(() => {
    setSecondsLeft(minutes * 60);
  }, [minutes]);

  // Keep the running state in step with the "pressure timer" setting.
  useEffect(() => {
    setRunning(initiallyRunning);
  }, [initiallyRunning]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  return {
    secondsLeft,
    running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: () => {
      setRunning(false);
      setSecondsLeft(minutes * 60);
    },
  };
}
