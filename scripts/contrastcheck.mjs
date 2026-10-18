// WCAG contrast gate for the design tokens in src/styles/tokens.css.
// Run with: npm run contrast  (exits 1 if any pair is below its threshold).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/styles/tokens.css"), "utf8");

const raw = new Map();
for (const m of css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
  raw.set(m[1], m[2].trim());
}

function resolve(name, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const value = raw.get(name);
  if (!value) return null;
  const ref = value.match(/^var\(--([\w-]+)\)$/);
  if (ref) return resolve(ref[1], seen);
  const hex = value.match(/#[0-9a-fA-F]{6}\b/);
  return hex ? hex[0].toLowerCase() : null;
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// [foreground, background, minimum] — text 4.5:1, UI/graphics 3:1.
const checks = [
  ["color-text", "color-bg", 4.5],
  ["color-text", "color-surface", 4.5],
  ["color-text", "color-surface-muted", 4.5],
  ["color-text", "color-accent-soft-bg", 4.5],
  ["color-text-muted", "color-bg", 4.5],
  ["color-text-muted", "color-surface", 4.5],
  ["color-text-muted", "color-surface-muted", 4.5],
  ["color-text-muted", "color-accent-soft-bg", 4.5],
  ["color-accent-contrast", "color-accent", 4.5],
  ["color-accent-contrast", "color-accent-hover", 4.5],
  ["color-accent-contrast", "color-accent-active", 4.5],
  ["color-accent", "color-surface", 4.5],
  ["color-accent", "color-bg", 4.5],
  ["color-success", "color-surface", 4.5],
  ["color-success", "color-bg", 4.5],
  ["color-success", "color-success-bg", 4.5],
  ["color-warning", "color-surface", 4.5],
  ["color-warning", "color-bg", 4.5],
  ["color-warning", "color-warning-bg", 4.5],
  ["color-danger", "color-bg", 4.5],
  ["color-danger", "color-surface", 4.5],
  ["color-danger", "color-surface-muted", 4.5],
  ["color-danger", "color-danger-bg", 4.5],
  ["color-border-control", "color-bg", 3],
  ["color-border-control", "color-surface", 3],
  ["color-border-control", "color-surface-muted", 3],
  ["color-focus", "color-bg", 3],
  ["color-focus", "color-surface", 3],
  ["color-focus", "color-surface-muted", 3],
  ["color-focus", "color-accent-soft-bg", 3],
];

let failed = 0;
const rows = [];
for (const [fg, bg, min] of checks) {
  const a = resolve(fg);
  const b = resolve(bg);
  if (!a || !b) {
    rows.push([fg, bg, "?", "?", `MISSING (${fg}=${a}, ${bg}=${b})`, false]);
    failed++;
    continue;
  }
  const value = ratio(a, b);
  const ok = value >= min;
  if (!ok) failed++;
  rows.push([fg, bg, a, b, value.toFixed(2), ok]);
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("foreground", 26) + pad("background", 26) + pad("ratio", 8) + pad("min", 5) + "result");
console.log("-".repeat(72));
for (const [fg, bg, a, b, value, ok] of rows) {
  const min = checks.find((c) => c[0] === fg && c[1] === bg)?.[2] ?? "";
  console.log(
    pad(fg, 26) + pad(bg, 26) + pad(value, 8) + pad(min, 5) + (ok ? "pass" : "FAIL") +
      (a && b ? `   (${a} on ${b})` : ""),
  );
}

if (failed) {
  console.error(`\ncontrast: ${failed} pair(s) below threshold.`);
  process.exit(1);
}
console.log(`\ncontrast: all ${rows.length} pairs pass.`);
