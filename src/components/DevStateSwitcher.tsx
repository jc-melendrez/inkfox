import { useSyncExternalStore } from "react";
import { getSimState, setSimState, subscribeSim, type SimState } from "../api/client";

/** Dev-only toolbar to force loading / empty / error states per screen. */
export function DevStateSwitcher() {
  const state = useSyncExternalStore(subscribeSim, getSimState, getSimState);
  return (
    <div className="devbar">
      <label htmlFor="dev-state">Dev state</label>
      <select
        id="dev-state"
        value={state}
        onChange={(e) => setSimState(e.target.value as SimState)}
      >
        <option value="auto">Auto</option>
        <option value="loading">Loading</option>
        <option value="empty">Empty</option>
        <option value="error">Error</option>
      </select>
    </div>
  );
}
