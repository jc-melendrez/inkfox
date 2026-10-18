import { ApiError, respond } from "./client";
import { getDB, saveDB } from "./mockData";
import type { Question } from "./types";

export function listQuestions(materialId: string): Promise<Question[]> {
  const mine = getDB()
    .questions.filter((q) => q.materialId === materialId)
    .sort((a, b) => a.index - b.index);
  return respond(mine, []);
}

export function getQuestion(id: string): Promise<Question> {
  const found = getDB().questions.find((q) => q.id === id);
  if (!found) return Promise.reject(new ApiError("We could not find that question."));
  return respond(found);
}

/** First question of a material with no submitted feedback yet. */
export function nextUnanswered(materialId: string): Promise<Question | null> {
  const db = getDB();
  const mine = db.questions
    .filter((q) => q.materialId === materialId)
    .sort((a, b) => a.index - b.index);
  const next = mine.find((q) => !db.done[q.id]) ?? null;
  return respond(next, null);
}

const NEW_QUESTIONS = [
  "What is one thing you would question about this material?",
  "How could you explain this idea to someone younger?",
  "What is the strongest counter-argument here?",
  "Which part of the material is least convincing, and why?",
];

/** Adds more questions to an existing material ("New questions"). */
export function generateQuestions(materialId: string): Promise<Question[]> {
  const db = getDB();
  const existing = db.questions.filter((q) => q.materialId === materialId);
  const offset = existing.length;
  const created = NEW_QUESTIONS.map((text, i) => ({
    id: `${materialId}-q${offset + i + 1}`,
    materialId,
    index: offset + i + 1,
    total: offset + NEW_QUESTIONS.length,
    text,
    sourcePassage:
      existing[0]?.sourcePassage ?? "Use the key ideas from this material as your evidence.",
    method: db.settings.defaultMethod,
  }));
  db.questions.push(...created);
  for (const q of db.questions.filter((q) => q.materialId === materialId)) {
    q.total = offset + NEW_QUESTIONS.length;
  }
  saveDB();
  return respond(created);
}
