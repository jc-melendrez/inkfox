import { ApiError, respond, respondVoid } from "../client";
import { getDB, resetDB, saveDB } from "./mockData";
import type { LoginInput, MethodKey, SignupInput, User, UserRole } from "../types";

export function getCurrentUser(): Promise<User | null> {
  const db = getDB();
  return respond<User | null>(db.loggedIn ? db.user : null, null);
}

export function login(input: LoginInput): Promise<User> {
  const email = input.email.trim();
  if (!email || !input.password.trim()) {
    return Promise.reject(new ApiError("Please enter your email and password."));
  }
  const db = getDB();
  db.user = { ...db.user, email };
  db.loggedIn = true;
  saveDB();
  return respond(db.user);
}

export function signup(input: SignupInput): Promise<User> {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim();
  if (!name) return Promise.reject(new ApiError("Please add your name."));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Promise.reject(new ApiError("That email looks incomplete. Check it and try again."));
  }
  if (input.password.length < 8) {
    return Promise.reject(new ApiError("Your password needs at least 8 characters."));
  }
  const db = getDB();
  db.user = {
    id: "u1",
    name,
    email,
    role: input.role,
    onboarded: false,
    avatarUrl: null,
  };
  db.loggedIn = true;
  saveDB();
  return respond(db.user);
}

export function loginWithGoogle(): Promise<User> {
  const db = getDB();
  db.loggedIn = true;
  saveDB();
  return respond(db.user);
}

export function completeOnboarding(patch: {
  role?: UserRole;
  method?: MethodKey;
}): Promise<User> {
  const db = getDB();
  if (patch.role) db.user = { ...db.user, role: patch.role };
  if (patch.method) db.settings = { ...db.settings, defaultMethod: patch.method };
  db.user = { ...db.user, onboarded: true };
  saveDB();
  return respond(db.user);
}

export function logout(): Promise<void> {
  const db = getDB();
  db.loggedIn = false;
  saveDB();
  return respondVoid();
}

export function requestPasswordReset(email: string): Promise<void> {
  if (!email.trim()) {
    return Promise.reject(new ApiError("Enter the email you signed up with."));
  }
  return respondVoid();
}

export function deleteAccount(): Promise<void> {
  resetDB();
  return respondVoid();
}
