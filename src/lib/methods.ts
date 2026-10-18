import type { MethodKey, UserRole } from "../api/types";

export interface MethodInfo {
  key: MethodKey;
  name: string;
  description: string;
}

export const METHODS: MethodInfo[] = [
  {
    key: "PEEL",
    name: "PEEL",
    description: "Point, Evidence, Explain, Link. Great for beginners.",
  },
  {
    key: "TEEL",
    name: "TEEL",
    description: "Topic sentence, Evidence, Explain, Link.",
  },
];

export interface MethodPart {
  key: string;
  short: string;
  /** Part name, e.g. "Point" (used by feedback tags). */
  name: string;
  /** Short prompt shown in the composer checklist. */
  instruction: string;
}

/** Single source for method part keys, names and checklist prompts. */
export const METHOD_PARTS: Record<MethodKey, MethodPart[]> = {
  PEEL: [
    { key: "P", short: "P", name: "Point", instruction: "State your answer in one sentence" },
    { key: "E", short: "E", name: "Evidence", instruction: "Add evidence from the text" },
    { key: "E", short: "E", name: "Explain", instruction: "Explain why it matters" },
    { key: "L", short: "L", name: "Link", instruction: "Link back to the question" },
  ],
  TEEL: [
    { key: "T", short: "T", name: "Topic sentence", instruction: "Open with a topic sentence" },
    { key: "E", short: "E", name: "Evidence", instruction: "Add evidence from the text" },
    { key: "E", short: "E", name: "Explain", instruction: "Explain why it matters" },
    { key: "L", short: "L", name: "Link", instruction: "Link back to the question" },
  ],
};

export const ROLES: UserRole[] = [
  "High school student",
  "University student",
  "Lifelong learner",
  "Teacher",
];

export const METHOD_OPTIONS = METHODS.map((m) => ({ value: m.key, label: m.key }));

export const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r }));

export const TEXT_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];
