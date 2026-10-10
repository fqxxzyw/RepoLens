import type { Analysis, HistoryEntry } from "../types";
const CACHE = "repolens:cache:v1";
const HISTORY = "repolens:history:v1";
const TTL = 10 * 60 * 1000;
export function readHistory(): HistoryEntry[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HISTORY) || "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (item): item is HistoryEntry =>
              !!item &&
              typeof item.fullName === "string" &&
              typeof item.analyzedAt === "string",
          )
          .slice(0, 10)
      : [];
  } catch {
    return [];
  }
}
export function writeHistory(entries: HistoryEntry[]): boolean {
  try {
    localStorage.setItem(HISTORY, JSON.stringify(entries.slice(0, 10)));
    return true;
  } catch {
    return false;
  }
}
export function getCached(name: string): Analysis | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE) || "null") as {
      name: string;
      time: number;
      data: Analysis;
    } | null;
    if (
      cached?.name === name.toLowerCase() &&
      Date.now() - cached.time < TTL &&
      cached.data?.repo?.full_name &&
      !cached.data.repo.private &&
      cached.data.languages &&
      cached.data.activity &&
      cached.data.readme &&
      cached.data.issues
    )
      return cached.data;
  } catch {
    /* Storage can be disabled. */
  }
  return null;
}
export function cacheAnalysis(name: string, data: Analysis) {
  if (
    data.repo.private ||
    [data.activity, data.languages, data.readme, data.issues].some(
      (resource) => resource.status !== "ready",
    )
  )
    return;
  try {
    localStorage.setItem(
      CACHE,
      JSON.stringify({ name: name.toLowerCase(), time: Date.now(), data }),
    );
  } catch {
    /* Best-effort public cache. */
  }
}
export function clearPrivateLocalData() {
  try {
    localStorage.removeItem(HISTORY);
    localStorage.removeItem(CACHE);
  } catch {
    /* Storage may be unavailable. */
  }
}
