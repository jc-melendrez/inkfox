import { request } from "../http";
import type { Settings } from "../types";

export function getSettings(): Promise<Settings> {
  return request<Settings>("/settings");
}

export function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return request<Settings>("/settings", { method: "PUT", json: patch });
}
