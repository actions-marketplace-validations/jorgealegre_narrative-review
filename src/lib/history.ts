const STORAGE_KEY = "narrative-review:history";
const MAX_ENTRIES = 20;

export interface HistoryEntry {
  id: string;
  title: string;
  source: "pr" | "local";
  /** e.g. "owner/repo#123" or "repo:base→head" */
  label: string;
  url: string;
  analyzedAt: string;
  chapters: number;
  model: string;
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(entry: HistoryEntry) {
  const history = getHistory().filter((h) => h.id !== entry.id);
  history.unshift(entry);
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function removeFromHistory(id: string) {
  const history = getHistory().filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
