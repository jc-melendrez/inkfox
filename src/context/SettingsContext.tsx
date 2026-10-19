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
  defaultInstructions: "",
};

interface SettingsApi {
  settings: Settings;
  /** True once the stored settings have loaded (or failed); gates prefills. */
  ready: boolean;
  update: (patch: Partial<Settings>) => Promise<Settings>;
}

const SettingsContext = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    api.settings
      .getSettings()
      .then((s) => {
        // Spread over DEFAULTS so storage written before a field existed stays valid.
        if (alive) setSettings({ ...DEFAULTS, ...s });
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (alive) setReady(true);
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

  const value = useMemo(() => ({ settings, ready, update }), [settings, ready, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
