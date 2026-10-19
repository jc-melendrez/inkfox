import { request } from "../http";
import type { EssayDraft, Feedback } from "../types";

export function getDraft(questionId: string): Promise<EssayDraft | null> {
  return request<EssayDraft | null>(`/questions/${questionId}/draft`);
}

export function saveDraft(questionId: string, content: string): Promise<EssayDraft> {
  return request<EssayDraft>(`/questions/${questionId}/draft`, {
    method: "PUT",
    json: { content },
  });
}

export function submitEssay(
  questionId: string,
  content: string,
  instructions = "",
): Promise<Feedback> {
  return request<Feedback>(`/questions/${questionId}/essays`, {
    method: "POST",
    json: { content, instructions },
  });
}
