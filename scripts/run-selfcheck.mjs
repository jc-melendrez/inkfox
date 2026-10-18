import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Keep output inside the project so Node resolves node_modules for external deps.
const dir = join(process.cwd(), "node_modules", ".foxtutor-tmp");
mkdirSync(dir, { recursive: true });

for (const entry of ["scripts/selfcheck.ts", "scripts/rendercheck.tsx"]) {
  const out = join(dir, entry.replace(/[/.]/g, "_") + ".mjs");
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    jsx: "automatic",
    packages: "external",
    outfile: out,
    logLevel: "silent",
    define: {
      "import.meta.env": JSON.stringify({
        VITE_API_MODE: "mock",
        VITE_API_BASE_URL: "/api",
        VITE_ENABLE_GOOGLE_AUTH: "false",
      }),
    },
  });
  await import(pathToFileURL(out).href);
}
