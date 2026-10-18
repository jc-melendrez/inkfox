import { respond } from "../client";
import { getDB, saveDB } from "./mockData";
import type { Settings } from "../types";

export function getSettings(): Promise<Settings> {
  return respond(getDB().settings);
}

export function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const db = getDB();
  db.settings = { ...db.settings, ...patch };
  saveDB();
  return respond(db.settings);
}
