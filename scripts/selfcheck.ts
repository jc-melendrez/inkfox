import assert from "node:assert/strict";
import * as api from "../src/api";
import { getToken, request, setToken } from "../src/api/http";

// Minimal localStorage shim so the mock persistence layer can run under Node.
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

async function main() {
  const seeded = await api.materials.listMaterials();
  assert.ok(seeded.length >= 3, "seed materials present");
  const bio = seeded.find((m) => m.title === "Cell Biology Notes")!;
  assert.equal(bio.questionsDone, 4, "seeded done count hydrates to 4");

  // Upload → poll until ready → questions generated.
  const created = await api.materials.uploadMaterial({
    name: "Unit Test Notes.PDF",
    size: 120_000,
    type: "application/pdf",
  });
  assert.equal(created.status, "processing");
  assert.equal(created.fileType, "PDF");
  let material = created;
  while (material.status === "processing") {
    material = await api.materials.advanceProcessing(material.id);
  }
  assert.equal(material.status, "ready");
  assert.ok(material.questionCount > 0, "questions generated");

  // Submit an essay → feedback shape.
  const [question] = await api.questions.listQuestions(material.id);
  const feedback = await api.essays.submitEssay(
    question.id,
    "Mitochondria release energy for the cell. The text says ATP powers reactions. This matters because cells need energy to work. So they cannot survive without mitochondria.",
  );
  assert.equal(feedback.partsTotal, 4);
  assert.equal(feedback.method, question.method);
  assert.ok(feedback.partsLanded >= 1, "at least one part landed");
  assert.ok(feedback.headline.length > 0);

  // A one-liner is short → some part should need work, not all strong.
  const weak = await api.essays.submitEssay(question.id, "Energy.");
  assert.ok(
    weak.parts.some((p) => p.status !== "strong"),
    "short draft flags weaker parts",
  );

  // Progress + resume derive from the draft we just saved.
  const progress = await api.progress.getProgress();
  assert.equal(progress.byMaterial.length, seeded.length + 1);
  assert.ok(progress.resume, "resume card available");

  // Settings round-trips.
  const settings = await api.settings.updateSettings({ textSize: "large" });
  assert.equal(settings.textSize, "large");

  // Session summary for the seeded material.
  const summary = await api.sessions.completeSession("m1");
  assert.equal(summary.materialId, "m1");
  assert.ok(summary.masteryTo >= summary.masteryFrom);

  // Auth validation rejects a bad email and accepts a good signup.
  await assert.rejects(() => api.auth.signup({ name: "A", email: "bad", password: "12345678", role: "Teacher" }));
  const user = await api.auth.signup({
    name: "  Test   User ",
    email: "test@example.com",
    password: "supersecret",
    role: "Teacher",
  });
  assert.equal(user.name, "Test User", "whitespace trimmed and collapsed");
  assert.equal(user.onboarded, false);

  // Token lifecycle: a 401 clears the stored token, except on login/signup.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(null, { status: 401 })) as unknown as typeof fetch;

  setToken("live-token");
  await assert.rejects(() => request("/profile"));
  assert.equal(getToken(), null, "401 clears the stored token");

  setToken("fresh-token");
  await assert.rejects(() =>
    request("/auth/login", { method: "POST", json: {}, preserveTokenOn401: true }),
  );
  assert.equal(getToken(), "fresh-token", "login keeps its token on 401");

  globalThis.fetch = realFetch;

  console.log("selfcheck: all assertions passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
