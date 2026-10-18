import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "../api";
import type { Settings } from "../api/types";

const DEFAULTS: Settings = {
  defaultMethod: "PEEL",
  pressureTimer: false,
  timerMinutes: 30,
  dailyReminder: true,
  weeklySummary: false,
  textSize: "medium",
};

interface SettingsApi {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<Settings>;
}

const SettingsContext = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    let alive = true;
    api.settings
      .getSettings()
      .then((s) => {
        if (alive) setSettings(s);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.textSize = settings.textSize;
  }, [settings.textSize]);

  const update = useCallback(async (patch: Partial<Settings>) => {
    const next = await api.settings.updateSettings(patch);
    setSettings(next);
    return next;
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
