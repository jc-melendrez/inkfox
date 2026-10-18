import { ApiError, respond, respondVoid } from "../client";
import { getDB, saveDB } from "./mockData";
import type { Profile, User, UserRole } from "../types";

export function getProfile(): Promise<Profile> {
  const db = getDB();
  return respond({
    user: db.user,
    stats: db.stats,
    milestones: db.milestones,
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function updateProfile(patch: {
  name?: string;
  email?: string;
  role?: UserRole;
}): Promise<User> {
  const db = getDB();
  const name = patch.name?.trim().replace(/\s+/g, " ");
  if (patch.name !== undefined && !name) {
    return Promise.reject(new ApiError("Please keep a name on your profile."));
  }
  const email = patch.email?.trim();
  if (patch.email !== undefined && (!email || !EMAIL_RE.test(email))) {
    return Promise.reject(
      new ApiError("That email address looks incomplete — check for a missing @ or domain name."),
    );
  }
  db.user = {
    ...db.user,
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(patch.role ? { role: patch.role } : {}),
  };
  saveDB();
  return respond(db.user);
}

export function changePassword(current: string, next: string): Promise<void> {
  if (next.length < 8) {
    return Promise.reject(new ApiError("Your new password needs at least 8 characters."));
  }
  if (!current.trim()) {
    return Promise.reject(new ApiError("Enter your current password."));
  }
  return respondVoid();
}

/** Phase 2 returns a real file; Phase 1 is a no-op acknowledgement. */
export function downloadMyData(): Promise<void> {
  return respondVoid();
}
