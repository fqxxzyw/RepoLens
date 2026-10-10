import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeRepository, GitHubError } from "../services/github";
import { parseRepository } from "../lib/parse";
import {
  cacheAnalysis,
  getCached,
  readHistory,
  writeHistory,
} from "../lib/storage";
import type { Analysis, HistoryEntry } from "../types";
export function useAnalysis(authenticated: boolean) {
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [storageWarning, setStorageWarning] = useState(false);
  const [cached, setCached] = useState(false);
  const active = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(
    () => () => {
      active.current?.abort();
    },
    [],
  );
  const analyze = useCallback(
    async (input: string, refresh = false) => {
      let parsed;
      try {
        parsed = parseRepository(input);
      } catch (error) {
        setError((error as Error).message);
        return;
      }
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      const id = ++sequence.current;
      const name = `${parsed.owner}/${parsed.repo}`;
      setError(null);
      setData(null);
      setLoading(true);
      setCached(false);
      try {
        // Authenticated reports stay in memory, so private data never enters the public cache.
        const saved = refresh || authenticated ? null : getCached(name);
        const report =
          saved ||
          (await analyzeRepository(
            parsed.owner,
            parsed.repo,
            controller.signal,
            authenticated,
          ));
        if (id !== sequence.current || controller.signal.aborted) return;
        setData(report);
        setCached(!!saved);
        if (!authenticated) cacheAnalysis(name, report);
        if (!report.repo.private) {
          setHistory((current) => {
            const next = [
              {
                fullName: report.repo.full_name,
                analyzedAt: report.analyzedAt,
              },
              ...current.filter(
                (item) =>
                  item.fullName.toLowerCase() !==
                  report.repo.full_name.toLowerCase(),
              ),
            ].slice(0, 10);
            if (!writeHistory(next)) setStorageWarning(true);
            return next;
          });
        }
      } catch (error) {
        if (id === sequence.current && !controller.signal.aborted)
          setError(
            error instanceof GitHubError
              ? `${error.message}${error.retryAt ? ` 预计 ${error.retryAt} 恢复。` : ""}`
              : "分析失败，请重试。",
          );
      } finally {
        if (id === sequence.current) setLoading(false);
      }
    },
    [authenticated],
  );
  function updateHistory(next: HistoryEntry[]) {
    setHistory(next);
    if (!writeHistory(next)) setStorageWarning(true);
  }
  function reset() {
    active.current?.abort();
    sequence.current++;
    setData(null);
    setLoading(false);
    setError(null);
  }
  return {
    data,
    loading,
    error,
    history,
    cached,
    storageWarning,
    analyze,
    updateHistory,
    reset,
  };
}
