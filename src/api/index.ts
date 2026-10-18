export * from "./types";
export * from "./client";

import * as mock from "./mock";
import * as real from "./real";

/**
 * VITE_API_MODE=real talks to the Django backend; anything else uses the mock.
 * Both sides expose the same namespaces and function signatures.
 */
const impl: typeof mock =
  import.meta.env.VITE_API_MODE === "real" ? (real as unknown as typeof mock) : mock;

export const auth = impl.auth;
export const materials = impl.materials;
export const questions = impl.questions;
export const essays = impl.essays;
export const feedback = impl.feedback;
export const progress = impl.progress;
export const sessions = impl.sessions;
export const settings = impl.settings;
export const profile = impl.profile;
