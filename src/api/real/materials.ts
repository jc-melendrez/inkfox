import { request } from "../http";
import type { Material, UploadInput } from "../types";

export function listMaterials(): Promise<Material[]> {
  return request<Material[]>("/materials");
}

export function getMaterial(id: string): Promise<Material> {
  return request<Material>(`/materials/${id}`);
}

export function uploadMaterial(input: UploadInput): Promise<Material> {
  const form = new FormData();
  if (input.file) form.append("file", input.file, input.name);
  form.append("name", input.name);
  return request<Material>("/materials", { method: "POST", formData: form });
}

export function advanceProcessing(id: string): Promise<Material> {
  return request<Material>(`/materials/${id}/processing`);
}

export function cancelProcessing(id: string): Promise<void> {
  return request<void>(`/materials/${id}/cancel`, { method: "POST" });
}

export function createSampleMaterial(): Promise<Material> {
  return request<Material>("/materials/sample", { method: "POST" });
}

export function deleteMaterial(id: string): Promise<void> {
  return request<void>(`/materials/${id}`, { method: "DELETE" });
}
