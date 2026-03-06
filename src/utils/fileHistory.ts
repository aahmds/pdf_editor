const HISTORY_KEY = 'pdf-editor-file-history';
const MAX_ENTRIES = 10;

export interface FileHistoryEntry {
  name: string;
  size: number;
  lastOpened: number;
}

export function getFileHistory(): FileHistoryEntry[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // Validate entries
    return parsed.filter(
      (e: any) => typeof e.name === 'string' && e.name.length <= 255 && typeof e.size === 'number'
    );
  } catch {
    return [];
  }
}

export function addToFileHistory(file: File): void {
  try {
    const history = getFileHistory();
    // Remove existing entry with same name
    const filtered = history.filter((e) => e.name !== file.name);
    // Add new entry at the beginning
    // Sanitize file name
    const safeName = file.name.slice(0, 255);
    filtered.unshift({
      name: safeName,
      size: file.size,
      lastOpened: Date.now(),
    });
    // Keep only MAX_ENTRIES
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_ENTRIES)));
  } catch { /* localStorage full, ignore */ }
}

export function clearFileHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
