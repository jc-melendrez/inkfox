import type {
  EssayDraft,
  Feedback,
  Material,
  MethodProgress,
  Milestone,
  ProfileStats,
  Question,
  ScorePoint,
  Settings,
  User,
} from "../types";

/**
 * Seeded mock database, persisted to localStorage so uploads, drafts and
 * feedback survive a reload. Only api/ modules import this file.
 */

export interface MockDB {
  loggedIn: boolean;
  user: User;
  materials: Material[];
  questions: Question[];
  drafts: Record<string, EssayDraft>;
  feedbackByQuestion: Record<string, Feedback[]>;
  done: Record<string, boolean>;
  settings: Settings;
  stats: ProfileStats;
  milestones: Milestone[];
  trend: ScorePoint[];
  methodProgress: MethodProgress[];
  uploadSeq: number;
  knowsQuestions: Record<string, boolean>;
}

const STORAGE_KEY = "foxtutor.db.v1";

const PASSAGE_CELL =
  "A cell is the smallest unit of life. The mitochondria are often called the powerhouse of the cell because they release energy stored in glucose as ATP through respiration. ATP powers almost every activity a cell performs, from building proteins to moving molecules across the membrane.";
const PASSAGE_WW2 =
  "World War Two grew out of the harsh terms of the Treaty of Versailles, the worldwide economic depression of the 1930s, the rise of fascist leaders such as Hitler and Mussolini, and the failure of the League of Nations to stop aggression. The invasion of Poland in 1939 triggered declarations of war across Europe.";
const PASSAGE_MEMO =
  "Our campaign aims to grow repeat purchases among existing customers. The proposed budget shifts spend from broad advertising toward email and loyalty rewards. Success will be measured by a 10% rise in returning customers over one quarter.";

const biologyQuestions = [
  "What is the main job of the cell membrane?",
  "How do ribosomes help a cell make proteins?",
  "Why is the nucleus important for cell activity?",
  "What role does the cytoplasm play inside a cell?",
  "Why do cells need mitochondria to survive?",
  "How does the cell wall differ from the cell membrane?",
  "What happens to a cell during osmosis?",
  "Why are enzymes important for cell reactions?",
  "How do cells reproduce through mitosis?",
  "Why is cell specialisation useful in multicellular organisms?",
];

const ww2Questions = [
  "What were the main causes of World War Two?",
  "How did the Treaty of Versailles create resentment?",
  "Why did the League of Nations fail to prevent war?",
  "How did the Great Depression help fascist leaders rise?",
  "Why did the invasion of Poland trigger a wider war?",
  "What role did alliances play in spreading the conflict?",
  "How did propaganda shape public support for the war?",
  "Why did the United States join the war in 1941?",
  "How did wartime economies change daily life?",
  "Why is it useful to separate long-term and short-term causes?",
];

const marketingQuestions = [
  "What is the main goal of the campaign?",
  "How should the budget be spent and why?",
  "Which metric proves the campaign worked?",
  "What might make a loyal customer stop returning?",
  "Why is email a good channel for repeat purchases?",
];

function buildQuestions(
  materialId: string,
  texts: string[],
  passage: string,
  method: "PEEL" | "TEEL",
): Question[] {
  return texts.map((text, i) => ({
    id: `${materialId}-q${i + 1}`,
    materialId,
    index: i + 1,
    total: texts.length,
    text,
    sourcePassage: passage,
    method,
  }));
}

export function seed(): MockDB {
  const materials: Material[] = [
    {
      id: "m1",
      title: "Cell Biology Notes",
      fileType: "PDF",
      pages: 12,
      uploadedAt: "2026-10-12T09:00:00.000Z",
      questionCount: 10,
      questionsDone: 4,
      status: "ready",
    },
    {
      id: "m2",
      title: "WW2 Causes Reading",
      fileType: "DOCX",
      pages: 6,
      uploadedAt: "2026-10-03T09:00:00.000Z",
      questionCount: 10,
      questionsDone: 10,
      status: "ready",
    },
    {
      id: "m3",
      title: "Marketing Memo",
      fileType: "TXT",
      pages: 2,
      uploadedAt: "2026-09-28T09:00:00.000Z",
      questionCount: 5,
      questionsDone: 0,
      status: "ready",
    },
  ];

  const questions: Question[] = [
    ...buildQuestions("m1", biologyQuestions, PASSAGE_CELL, "PEEL"),
    ...buildQuestions("m2", ww2Questions, PASSAGE_WW2, "PEEL"),
    ...buildQuestions("m3", marketingQuestions, PASSAGE_MEMO, "TEEL"),
  ];

  const draftText =
    "Mitochondria give cells the energy they need to live. The textbook says one cell makes millions of ATP per second. This is important because energy is used.";

  const drafts: Record<string, EssayDraft> = {
    "m1-q5": {
      id: "d-m1-q5",
      questionId: "m1-q5",
      content: draftText,
      wordCount: draftText.trim().split(/\s+/).length,
      updatedAt: "2026-10-17T18:00:00.000Z",
    },
  };

  const feedbackByQuestion: Record<string, Feedback[]> = {
    "m1-q5": [
      {
        id: "f-m1-q5-1",
        questionId: "m1-q5",
        draftNumber: 1,
        method: "PEEL",
        headline: "Nice work. Strong evidence here!",
        partsLanded: 3,
        partsTotal: 4,
        parts: [
          {
            key: "P",
            label: "Point",
            text: "Mitochondria give cells the energy they need to live.",
            status: "strong",
          },
          {
            key: "E",
            label: "Evidence",
            text: "The textbook says one cell makes millions of ATP per second.",
            status: "strong",
          },
          {
            key: "E",
            label: "Explain",
            text: "This is important because energy is used.",
            status: "needs_work",
          },
          {
            key: "L",
            label: "Link",
            text: "",
            status: "missing",
            note: "No linking sentence yet.",
          },
        ],
        strengths: [
          "Clear point in your first sentence",
          "Evidence is specific and from the text",
        ],
        improvements: [
          {
            partKey: "E",
            label: "Explain",
            message: "say what ATP does in the cell.",
          },
          {
            partKey: "L",
            label: "Link",
            message: "add a closing sentence back to the question.",
          },
        ],
        instructions: "",
      },
    ],
  };

  return {
    loggedIn: false,
    user: {
      id: "u1",
      name: "Sam Rivera",
      email: "sam.rivera@university.edu",
      role: "University student",
      onboarded: true,
      avatarUrl: null,
    },
    materials,
    questions,
    drafts,
    feedbackByQuestion,
    done: {
      "m1-q1": true,
      "m1-q2": true,
      "m1-q3": true,
      "m1-q4": true,
      "m2-q1": true,
      "m2-q2": true,
      "m2-q3": true,
      "m2-q4": true,
      "m2-q5": true,
      "m2-q6": true,
      "m2-q7": true,
      "m2-q8": true,
      "m2-q9": true,
      "m2-q10": true,
    },
    settings: {
      defaultMethod: "PEEL",
      pressureTimer: false,
      timerMinutes: 30,
      dailyReminder: true,
      weeklySummary: false,
      textSize: "medium",
      defaultInstructions: "",
    },
    stats: { dayStreak: 7, essaysWritten: 34, methodsTried: 2 },
    milestones: [
      { id: "ms1", label: "First essay", earned: true },
      { id: "ms2", label: "3-day streak", earned: true },
      { id: "ms3", label: "7-day streak", earned: true },
      { id: "ms4", label: "10 essays written", earned: true },
      { id: "ms5", label: "PEEL Pro", earned: true },
      { id: "ms6", label: "TEEL Explorer", earned: false },
    ],
    trend: [
      { label: "1", value: 48 },
      { label: "2", value: 52 },
      { label: "3", value: 50 },
      { label: "4", value: 58 },
      { label: "5", value: 61 },
      { label: "6", value: 59 },
      { label: "7", value: 66 },
      { label: "8", value: 70 },
    ],
    methodProgress: [
      {
        method: "PEEL",
        label: "PEEL",
        level: 3,
        levelLabel: "Practicing",
        percent: 62,
        started: true,
      },
      {
        method: "TEEL",
        label: "TEEL",
        level: 1,
        levelLabel: "Getting started",
        percent: 30,
        started: true,
      },
      {
        method: "Other",
        label: "Other methods",
        level: 0,
        levelLabel: "Not started",
        percent: 0,
        started: false,
      },
    ],
    uploadSeq: 0,
    knowsQuestions: {},
  };
}

let db: MockDB | null = null;

export function getDB(): MockDB {
  if (db) return db;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    db = raw ? (JSON.parse(raw) as MockDB) : seed();
  } catch {
    db = seed();
  }
  return db;
}

export function saveDB(): void {
  if (!db) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage full or unavailable — the in-memory copy still works.
  }
}

/** Clears persisted state (used by Profile → log out / delete account). */
export function resetDB(): void {
  db = seed();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export { STORAGE_KEY };
