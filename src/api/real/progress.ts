import { request } from "../http";
import type { Progress, ResumeInfo } from "../types";

export function getProgress(): Promise<Progress> {
  return request<Progress>("/progress");
}

export function getResume(): Promise<ResumeInfo | null> {
  return request<ResumeInfo | null>("/progress/resume");
}
