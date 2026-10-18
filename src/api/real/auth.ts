import { request, setToken } from "../http";
import type { LoginInput, MethodKey, SignupInput, User, UserRole } from "../types";

export function getCurrentUser(): Promise<User | null> {
  return request<User | null>("/auth/me");
}

export function login(input: LoginInput): Promise<User> {
  return request<User>("/auth/login", {
    method: "POST",
    json: { email: input.email.trim(), password: input.password },
    captureToken: true,
    preserveTokenOn401: true,
  });
}

export function signup(input: SignupInput): Promise<User> {
  return request<User>("/auth/signup", {
    method: "POST",
    json: input,
    captureToken: true,
    preserveTokenOn401: true,
  });
}

export function loginWithGoogle(): Promise<User> {
  return request<User>("/auth/google", { method: "POST" });
}

export function completeOnboarding(patch: {
  role?: UserRole;
  method?: MethodKey;
}): Promise<User> {
  return request<User>("/onboarding/complete", { method: "POST", json: patch });
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" }).finally(() => setToken(null));
}

export function requestPasswordReset(email: string): Promise<void> {
  return request<void>("/auth/password/reset", { method: "POST", json: { email } });
}

export function deleteAccount(): Promise<void> {
  return request<void>("/account", { method: "DELETE" }).finally(() => setToken(null));
}
