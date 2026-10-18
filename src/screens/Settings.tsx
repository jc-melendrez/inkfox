import { useEffect, useState } from "react";
import type { MethodKey, TextSize } from "../api/types";
import { Button, Card, Checkbox, Input, Select } from "../components";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { METHOD_OPTIONS, TEXT_SIZE_OPTIONS } from "../lib/methods";

export function SettingsScreen() {
  const { settings, update } = useSettings();
  const { notify } = useToast();
  const [form, setForm] = useState(settings);
  const [timerText, setTimerText] = useState(String(settings.timerMinutes));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
    setTimerText(String(settings.timerMinutes));
  }, [settings]);

  async function save() {
    const timerMinutes = Math.min(180, Math.max(1, Number(timerText) || 1));
    const next = { ...form, timerMinutes };
    setSaving(true);
    try {
      await update(next);
      setForm(next);
      setTimerText(String(timerMinutes));
      notify("Settings saved.", "success");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Settings</h1>
      </div>
      <Card className="settings-card">
        <Select
          label="Default method"
          value={form.defaultMethod}
          onChange={(e) => setForm({ ...form, defaultMethod: e.target.value as MethodKey })}
          options={METHOD_OPTIONS}
        />
        <Checkbox
          label="Pressure timer on by default"
          checked={form.pressureTimer}
          onChange={(e) => setForm({ ...form, pressureTimer: e.target.checked })}
        />
        <Input
          label="Timer length (minutes)"
          type="number"
          min={1}
          max={180}
          value={timerText}
          onChange={(e) => setTimerText(e.target.value)}
        />
        <Checkbox
          label="Daily practice reminder"
          checked={form.dailyReminder}
          onChange={(e) => setForm({ ...form, dailyReminder: e.target.checked })}
        />
        <Checkbox
          label="Weekly progress summary"
          checked={form.weeklySummary}
          onChange={(e) => setForm({ ...form, weeklySummary: e.target.checked })}
        />
        <Select
          label="Text size"
          value={form.textSize}
          onChange={(e) => setForm({ ...form, textSize: e.target.value as TextSize })}
          options={TEXT_SIZE_OPTIONS}
        />
        <Button variant="primary" fullWidth size="lg" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </Card>
    </>
  );
}
