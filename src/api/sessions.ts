import { ApiError, respond } from "./client";
import { getDB } from "./mockData";
import type { SessionSummary } from "./types";

export function completeSession(materialId: string): Promise<SessionSummary> {
  const db = getDB();
  const material = db.materials.find((m) => m.id === materialId);
  if (!material) return Promise.reject(new ApiError("We could not find that material."));

  const mine = db.questions.filter((q) => q.materialId === materialId);
  const essaysCompleted = mine.filter((q) => db.done[q.id]).length;
  const method = mine[0]?.method ?? db.settings.defaultMethod;

  const progress = db.methodProgress.find((m) => m.method === method);
  const masteryTo = progress?.percent ?? 0;
  const masteryFrom = Math.max(0, masteryTo - 7);

  const scores = db.trend.map((p) => p.value);
  const avgScoreDelta =
    scores.length >= 2 ? scores[scores.length - 1] - scores[scores.length - 2] : 0;

  const best = mine
    .flatMap((q) => (db.feedbackByQuestion[q.id] ?? []).map((f) => ({ q, f })))
    .flatMap(({ q, f }) =>
      f.parts
        .filter((p) => p.status === "strong")
        .map((p) => ({ q, label: p.label })),
    )
    .pop();

  const bestMoment = best
    ? `${best.label} in Question ${best.q.index}`
    : "Finishing the session";

  return respond({
    materialId,
    essaysCompleted,
    avgScoreDelta,
    method,
    masteryFrom,
    masteryTo,
    bestMoment,
  });
}
