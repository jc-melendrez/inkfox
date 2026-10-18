/**
 * Real HTTP transport for the Django backend. Used when VITE_API_MODE=real.
 * Keeps the same `ApiError` so screens handle mock and real failures alike.
 */
import { ApiError } from "./client";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TOKEN_KEY = "foxtutor.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function messageFrom(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.message === "string" && body.message) return body.message;
    const errors = body?.errors;
    if (errors && typeof errors === "object") {
      const first = Object.values(errors).flat().find((v) => typeof v === "string");
      if (typeof first === "string") return first;
    }
  } catch {
    /* non-JSON body */
  }
  return "Something went wrong on our side. Please try again.";
}

interface RequestOptions {
  method?: string;
  json?: unknown;
  formData?: FormData;
  /** Read the X-Auth-Token response header (signup / login / password change). */
  captureToken?: boolean;
  /** Keep the stored token on 401 (auth entry points: login / signup). */
  preserveTokenOn401?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", json, formData, captureToken, preserveTokenOn401 } = options;
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;

  let body: BodyInit | undefined;
  if (formData) {
    body = formData;
  } else if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { method, headers, body });
  } catch {
    throw new ApiError("We could not reach the server. Check your connection and try again.");
  }

  if (captureToken) {
    const issued = response.headers.get("X-Auth-Token");
    if (issued) setToken(issued);
  }
  // A dead/expired token makes every later call 401; drop it so the app can
  // settle into a clean signed-out state. Login/signup opt out (not a session).
  if (response.status === 401 && !preserveTokenOn401) setToken(null);
  if (response.status === 204) return undefined as T;
  if (!response.ok) throw new ApiError(await messageFrom(response));

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
