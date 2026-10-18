import { request } from "../http";
import type { SessionSummary } from "../types";

export function completeSession(materialId: string): Promise<SessionSummary> {
  return request<SessionSummary>(`/materials/${materialId}/session/complete`, {
    method: "POST",
  });
}
