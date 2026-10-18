import { request } from "../http";
import type { Question } from "../types";

export function listQuestions(materialId: string): Promise<Question[]> {
  return request<Question[]>(`/materials/${materialId}/questions`);
}

export function getQuestion(id: string): Promise<Question> {
  return request<Question>(`/questions/${id}`);
}

export function nextUnanswered(materialId: string): Promise<Question | null> {
  return request<Question | null>(`/materials/${materialId}/questions/next`);
}

export function generateQuestions(materialId: string): Promise<Question[]> {
  return request<Question[]>(`/materials/${materialId}/questions`, { method: "POST" });
}
