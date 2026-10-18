import { ApiError, respond, respondVoid } from "../client";
import { getDB, saveDB } from "./mockData";
import { buildFeedback } from "./feedback";
import type { EssayDraft, Feedback } from "../types";

function countWords(content: string): number {
  const t = content.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function getDraft(questionId: string): Promise<EssayDraft | null> {
  return respond(getDB().drafts[questionId] ?? null, null);
}

/** Autosave — called on a debounce while typing. */
export function saveDraft(questionId: string, content: string): Promise<EssayDraft> {
  const db = getDB();
  const draft: EssayDraft = {
    id: db.drafts[questionId]?.id ?? `d-${questionId}`,
    questionId,
    content,
    wordCount: countWords(content),
    updatedAt: new Date().toISOString(),
  };
  db.drafts[questionId] = draft;
  saveDB();
  return respondVoid().then(() => draft);
}

function levelFor(percent: number): { level: number; levelLabel: string } {
  const levelLabel =
    percent >= 70 ? "Confident" : percent >= 40 ? "Practicing" : percent >= 20 ? "Building" : "Getting started";
  return { level: Math.min(5, Math.floor(percent / 20) + 1), levelLabel };
}

export function submitEssay(questionId: string, content: string): Promise<Feedback> {
  const db = getDB();
  const question = db.questions.find((q) => q.id === questionId);
  if (!question) return Promise.reject(new ApiError("We could not find that question."));
  if (!content.trim()) {
    return Promise.reject(new ApiError("Write a little first, then submit for feedback."));
  }

  const history = db.feedbackByQuestion[questionId] ?? [];
  const feedback = buildFeedback(questionId, content, question.method, history.length + 1);

  db.drafts[questionId] = {
    id: db.drafts[questionId]?.id ?? `d-${questionId}`,
    questionId,
    content,
    wordCount: countWords(content),
    updatedAt: new Date().toISOString(),
  };
  db.feedbackByQuestion[questionId] = [...history, feedback];
  const wasDone = db.done[questionId];
  db.done[questionId] = true;

  db.stats.essaysWritten += 1;
  const score = Math.round((feedback.partsLanded / feedback.partsTotal) * 100);
  db.trend = [...db.trend.slice(-7), { label: String(db.trend.length + 1), value: score }];
  const mp = db.methodProgress.find((m) => m.method === question.method);
  if (mp && !wasDone) {
    mp.percent = Math.min(100, mp.percent + 2);
    Object.assign(mp, levelFor(mp.percent));
  }
  saveDB();
  return respond(feedback);
}
