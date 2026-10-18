import { ApiError, respond } from "../client";
import { METHOD_PARTS } from "../../lib/methods";
import { getDB } from "./mockData";
import type { Feedback, FeedbackImprovement, FeedbackPart, MethodKey, PartStatus } from "../types";

const IMPROVE_HINT: Record<string, string> = {
  P: "state your answer in one clear sentence.",
  T: "open with one clear topic sentence.",
  E: "add a detail or short quote from the text.",
  L: "add a closing sentence back to the question.",
};

function splitSentences(content: string): string[] {
  return content
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function statusOf(words: number): PartStatus {
  if (words === 0) return "missing";
  if (words < 8) return "needs_work";
  return "strong";
}

/** Deterministic stand-in for the Phase 2 AI evaluation. */
export function buildFeedback(
  questionId: string,
  content: string,
  method: MethodKey,
  draftNumber: number,
): Feedback {
  const sentences = splitSentences(content);
  const slots = METHOD_PARTS[method];
  const parts: FeedbackPart[] = slots.map((slot, i) => {
    const extra = i === slots.length - 1 ? sentences.slice(i).join(" ") : sentences[i] ?? "";
    const text = extra.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const status = statusOf(words);
    return {
      key: slot.key,
      label: slot.name,
      text,
      status,
      note: status === "missing" ? `No ${slot.name.toLowerCase()} yet.` : undefined,
    };
  });

  const landed = parts.filter((p) => p.status !== "missing").length;
  const headline =
    landed === slots.length
      ? "Excellent work — every part landed!"
      : landed >= 3
        ? "Nice work. Strong evidence here!"
        : landed >= 2
          ? "Good start — you are building the structure."
          : "Every draft is progress. Let's build the structure.";

  const strengths = parts
    .filter((p) => p.status === "strong")
    .map((p) => `${p.label} is clear and specific`);

  const improvements: FeedbackImprovement[] = parts
    .filter((p) => p.status !== "strong")
    .map((p) => ({
      partKey: p.key,
      label: p.label,
      message: IMPROVE_HINT[p.key] ?? "make this part clearer.",
    }));

  return {
    id: `f-${questionId}-${draftNumber}`,
    questionId,
    draftNumber,
    method,
    headline,
    partsLanded: landed,
    partsTotal: slots.length,
    parts,
    strengths,
    improvements,
  };
}

export function getFeedback(questionId: string): Promise<Feedback | null> {
  const history = getDB().feedbackByQuestion[questionId] ?? [];
  const latest = history.length ? history[history.length - 1] : null;
  return respond(latest, null);
}

export function listFeedback(questionId: string): Promise<Feedback[]> {
  const history = getDB().feedbackByQuestion[questionId] ?? [];
  if (!history.length) return Promise.reject(new ApiError("No feedback yet for that draft."));
  return respond(history, []);
}
