import { request } from "../http";
import type { Feedback } from "../types";

export function getFeedback(questionId: string): Promise<Feedback | null> {
  return request<Feedback | null>(`/questions/${questionId}/feedback`);
}

export function listFeedback(questionId: string): Promise<Feedback[]> {
  return request<Feedback[]>(`/questions/${questionId}/feedback/history`);
}
