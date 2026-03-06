import type { SavedSignature } from '../types';

export const STORAGE_KEY = 'pdf-editor-signatures';

export function loadSignatures(): SavedSignature[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveSignatures(signatures: SavedSignature[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(signatures));
}
