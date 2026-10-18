import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../src/context/AuthContext";
import { SettingsProvider } from "../src/context/SettingsContext";
import { ToastProvider } from "../src/context/ToastContext";
import { AppRoutes } from "../src/routes";

// localStorage shim (module init reads it lazily, but be safe).
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
} as Storage;

function render(path: string): string {
  // React Router uses useLayoutEffect, which the SSR renderer warns about. Harmless here.
  const realError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("useLayoutEffect does nothing")) return;
    realError(...args);
  };
  try {
    return renderToString(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <SettingsProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </SettingsProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
  } finally {
    console.error = realError;
  }
}

const cases: [string, string][] = [
  ["/", "Write better essays"],
  ["/signup", "Create your account"],
  ["/login", "Welcome back"],
  ["/home", ""],
  ["/library", ""],
];

for (const [path, needle] of cases) {
  const html = render(path);
  if (!html.length) throw new Error(`${path} rendered nothing`);
  if (needle && !html.includes(needle)) {
    throw new Error(`${path} did not contain "${needle}"`);
  }
}

console.log("rendercheck: all routes rendered");
