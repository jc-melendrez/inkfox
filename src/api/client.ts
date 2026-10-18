/**
 * Tiny mock transport shared by every api/ module.
 * Phase 2 swaps the body of `respond` for real `fetch` calls — callers stay the same.
 */

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type SimState = "auto" | "loading" | "empty" | "error";

let simState: SimState = "auto";
const listeners = new Set<() => void>();

export function getSimState(): SimState {
  return simState;
}

export function setSimState(next: SimState): void {
  simState = next;
  listeners.forEach((l) => l());
}

export function subscribeSim(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function delay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves with `data`, or an empty variant, after a short delay.
 * The dev-only state switcher (client.simState) can force loading/empty/error.
 */
export async function respond<T>(data: T, empty?: T): Promise<T> {
  if (simState === "error") {
    await delay(400);
    throw new ApiError("Something went wrong on our side. Please try again.");
  }
  if (simState === "loading") {
    // Never resolves while the dev switcher is set to Loading.
    await delay(60_000);
  }
  await delay(280 + Math.random() * 320);
  if (simState === "empty" && empty !== undefined) {
    return structuredClone(empty);
  }
  return structuredClone(data);
}

/** No payload (mutations). */
export async function respondVoid(): Promise<void> {
  if (simState === "error") {
    await delay(400);
    throw new ApiError("We could not save that just now. Please try again.");
  }
  await delay(250);
}
