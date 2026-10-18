/** Shared domain types. Shaped so a Django REST Framework API can return the same JSON. */

export type ID = string;

export type MethodKey = "PEEL" | "TEEL";
export type FileType = "PDF" | "DOCX" | "TXT";
export type UserRole =
  | "High school student"
  | "University student"
  | "Lifelong learner"
  | "Teacher";

export interface User {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  onboarded: boolean;
  avatarUrl: string | null;
}

export interface Milestone {
  id: ID;
  label: string;
  earned: boolean;
}

export interface ProfileStats {
  dayStreak: number;
  essaysWritten: number;
  methodsTried: number;
}

/* ---------------- Materials ---------------- */

export type MaterialStatus = "processing" | "ready" | "failed";

export interface Material {
  id: ID;
  title: string;
  fileType: FileType;
  pages: number;
  uploadedAt: string; // ISO 8601
  questionCount: number;
  questionsDone: number;
  status: MaterialStatus;
  /** 0-100, present while status === "processing". */
  processingProgress?: number;
  /** Friendly explanation, present when status === "failed". */
  failureReason?: string;
}

export interface UploadInput {
  name: string;
  size: number;
  type: string;
  /** The actual file, present in real mode (multipart upload). */
  file?: File;
}

/* ---------------- Questions ---------------- */

export interface Question {
  id: ID;
  materialId: ID;
  /** 1-based position within the material. */
  index: number;
  total: number;
  text: string;
  sourcePassage: string;
  method: MethodKey;
}

/* ---------------- Essays ---------------- */

export interface EssayDraft {
  id: ID;
  questionId: ID;
  content: string;
  wordCount: number;
  updatedAt: string; // ISO 8601
}

/* ---------------- Feedback ---------------- */

export type PartStatus = "strong" | "needs_work" | "missing";

export interface FeedbackPart {
  key: string; // P, E, E, L
  label: string;
  text: string;
  status: PartStatus;
  note?: string;
}

export interface FeedbackImprovement {
  partKey: string;
  label: string;
  message: string;
}

export interface Feedback {
  id: ID;
  questionId: ID;
  draftNumber: number;
  method: MethodKey;
  headline: string;
  partsLanded: number;
  partsTotal: number;
  parts: FeedbackPart[];
  strengths: string[];
  improvements: FeedbackImprovement[];
}

/* ---------------- Progress ---------------- */

export interface MethodProgress {
  method: MethodKey | "Other";
  label: string;
  level: number;
  levelLabel: string;
  percent: number; // 0-100
  started: boolean;
}

export interface ScorePoint {
  label: string;
  value: number; // 0-100
}

export interface MaterialProgressRow {
  materialId: ID;
  title: string;
  done: number;
  total: number;
}

export interface ResumeInfo {
  materialId: ID;
  materialTitle: string;
  questionId: ID;
  questionText: string;
  questionIndex: number;
  total: number;
  method: MethodKey;
  savedAt: string;
}

export interface Progress {
  methods: MethodProgress[];
  trend: ScorePoint[];
  byMaterial: MaterialProgressRow[];
  resume: ResumeInfo | null;
}

/* ---------------- Sessions ---------------- */

export interface SessionSummary {
  materialId: ID;
  essaysCompleted: number;
  avgScoreDelta: number; // percentage points vs previous session
  method: MethodKey;
  masteryFrom: number;
  masteryTo: number;
  bestMoment: string;
}

/* ---------------- Settings ---------------- */

export type TextSize = "small" | "medium" | "large";

export interface Settings {
  defaultMethod: MethodKey;
  pressureTimer: boolean;
  timerMinutes: number;
  dailyReminder: boolean;
  weeklySummary: boolean;
  textSize: TextSize;
}

/* ---------------- Profile ---------------- */

export interface Profile {
  user: User;
  stats: ProfileStats;
  milestones: Milestone[];
}

/* ---------------- Auth inputs ---------------- */

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}
