/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "real" hits the Django backend; anything else uses the mock. */
  readonly VITE_API_MODE?: "mock" | "real";
  /** Base path for real API calls (default "/api"). */
  readonly VITE_API_BASE_URL?: string;
  /** "true" shows the Continue with Google button. */
  readonly VITE_ENABLE_GOOGLE_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
