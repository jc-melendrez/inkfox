import { ApiError, respond, respondVoid } from "../client";
import { getDB, saveDB, type MockDB } from "./mockData";
import type { FileType, Material, Question, UploadInput } from "../types";

/** Counts live on the done-map so the library and composer never disagree. */
function hydrate(material: Material, db: MockDB = getDB()): Material {
  const mine = db.questions.filter((q) => q.materialId === material.id);
  if (mine.length === 0) return material;
  return {
    ...material,
    questionCount: mine.length,
    questionsDone: mine.filter((q) => db.done[q.id]).length,
  };
}

function fileTypeFromName(name: string): FileType {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "docx" || ext === "doc") return "DOCX";
  if (ext === "txt" || ext === "md" || ext === "rtf") return "TXT";
  return "PDF";
}

const GENERATED_QUESTIONS = [
  "What is the main idea of this material?",
  "Which detail best supports the main idea?",
  "Why does the author make this point?",
  "How would you explain this in your own words?",
  "What evidence in the text is strongest?",
  "What might happen if this changed?",
  "How does this connect to what you already know?",
  "Why is this important to understand?",
];

function makeQuestions(materialId: string, title: string, count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${materialId}-q${i + 1}`,
    materialId,
    index: i + 1,
    total: count,
    text: GENERATED_QUESTIONS[i % GENERATED_QUESTIONS.length],
    sourcePassage: `From "${title}": use the key ideas you uploaded as your evidence.`,
    method: getDB().settings.defaultMethod,
  }));
}

export function listMaterials(): Promise<Material[]> {
  const db = getDB();
  return respond(db.materials.map((m) => hydrate(m, db)), []);
}

export function getMaterial(id: string): Promise<Material> {
  const db = getDB();
  const found = db.materials.find((m) => m.id === id);
  if (!found) return Promise.reject(new ApiError("We could not find that material."));
  return respond(hydrate(found, db));
}

export function uploadMaterial(input: UploadInput): Promise<Material> {
  const db = getDB();
  db.uploadSeq += 1;
  const id = `up${db.uploadSeq}`;
  const title = input.name.replace(/\.[^.]+$/, "").trim() || "Untitled material";
  const material: Material = {
    id,
    title,
    fileType: fileTypeFromName(input.name),
    pages: Math.max(1, Math.min(99, Math.round(input.size / 60_000) || 3)),
    uploadedAt: new Date().toISOString(),
    questionCount: 0,
    questionsDone: 0,
    status: "processing",
    processingProgress: 0,
  };
  db.materials.unshift(material);
  saveDB();
  return respond(material);
}

/** Advances a processing upload. The Library screen polls this. */
export function advanceProcessing(id: string): Promise<Material> {
  const db = getDB();
  const material = db.materials.find((m) => m.id === id);
  if (!material) return Promise.reject(new ApiError("That upload is no longer available."));
  if (material.status === "processing") {
    material.processingProgress = Math.min(100, (material.processingProgress ?? 0) + 20);
    if (material.processingProgress >= 100) {
      const questions = makeQuestions(material.id, material.title, GENERATED_QUESTIONS.length);
      db.questions.push(...questions);
      material.status = "ready";
      material.questionCount = questions.length;
      delete material.processingProgress;
    }
    saveDB();
  }
  return respond(hydrate(material, db));
}

export function cancelProcessing(id: string): Promise<void> {
  const db = getDB();
  const idx = db.materials.findIndex((m) => m.id === id);
  if (idx !== -1 && db.materials[idx].status === "processing") {
    db.materials.splice(idx, 1);
    saveDB();
  }
  return respondVoid();
}

export function createSampleMaterial(): Promise<Material> {
  const db = getDB();
  db.uploadSeq += 1;
  const id = `up${db.uploadSeq}`;
  const material: Material = {
    id,
    title: "Sample passage",
    fileType: "TXT",
    pages: 1,
    uploadedAt: new Date().toISOString(),
    questionCount: 0,
    questionsDone: 0,
    status: "ready",
  };
  const questions = makeQuestions(id, "Sample passage", 5);
  db.materials.unshift(material);
  db.questions.push(...questions);
  material.questionCount = questions.length;
  saveDB();
  return respond(hydrate(material, db));
}

export function deleteMaterial(id: string): Promise<void> {
  const db = getDB();
  db.materials = db.materials.filter((m) => m.id !== id);
  db.questions = db.questions.filter((q) => q.materialId !== id);
  saveDB();
  return respondVoid();
}
