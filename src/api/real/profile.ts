import { ApiError } from "../client";
import { getToken, request } from "../http";
import type { Profile, User, UserRole } from "../types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export function getProfile(): Promise<Profile> {
  return request<Profile>("/profile");
}

export function updateProfile(patch: {
  name?: string;
  email?: string;
  role?: UserRole;
}): Promise<User> {
  return request<User>("/profile", { method: "PUT", json: patch });
}

export function changePassword(current: string, next: string): Promise<void> {
  return request<void>("/profile/password", {
    method: "POST",
    json: { current, new: next },
    captureToken: true,
  });
}

export async function downloadMyData(): Promise<void> {
  const token = getToken();
  const response = await fetch(`${BASE}/profile/export`, {
    headers: token ? { Authorization: `Token ${token}` } : {},
  });
  if (!response.ok) {
    throw new ApiError("We could not prepare your data just now. Please try again.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "foxtutor-export.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
