import { respond } from "./client";
import { getDB } from "./mockData";
import type { MaterialProgressRow, Progress, ResumeInfo } from "./types";

function computeResume(): ResumeInfo | null {
  const db = getDB();
  const drafts = Object.values(db.drafts);
  if (!drafts.length) return null;
  const latest = drafts.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
  const question = db.questions.find((q) => q.id === latest.questionId);
  if (!question) return null;
  const material = db.materials.find((m) => m.id === question.materialId);
  if (!material) return null;
  return {
    materialId: material.id,
    materialTitle: material.title,
    questionId: question.id,
    questionText: question.text,
    questionIndex: question.index,
    total: question.total,
    method: question.method,
    savedAt: latest.updatedAt,
  };
}

export function getProgress(): Promise<Progress> {
  const db = getDB();
  const byMaterial: MaterialProgressRow[] = db.materials
    .filter((m) => m.status === "ready")
    .map((m) => {
      const mine = db.questions.filter((q) => q.materialId === m.id);
      return {
        materialId: m.id,
        title: m.title,
        done: mine.filter((q) => db.done[q.id]).length,
        total: mine.length,
      };
    });
  return respond(
    {
      methods: db.methodProgress,
      trend: db.trend,
      byMaterial,
      resume: computeResume(),
    },
    { methods: db.methodProgress, trend: [], byMaterial: [], resume: null },
  );
}

export function getResume(): Promise<ResumeInfo | null> {
  return respond(computeResume(), null);
}
