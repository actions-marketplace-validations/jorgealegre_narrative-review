"use client";

import { useState, useCallback, useEffect } from "react";
import { ReviewState } from "@/lib/types";

function storageKey(prId: string) {
  return `narrative-review:${prId}`;
}

export function useReviewState(prId: string) {
  const [state, setState] = useState<ReviewState>(() => {
    if (typeof window === "undefined") {
      return {
        prId,
        reviewedChapters: {},
        notes: {},
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };
    }
    const saved = localStorage.getItem(storageKey(prId));
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fall through
      }
    }
    return {
      prId,
      reviewedChapters: {},
      notes: {},
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey(prId), JSON.stringify(state));
    }
  }, [state, prId]);

  const toggleChapter = useCallback((chapterId: string) => {
    setState((prev) => ({
      ...prev,
      reviewedChapters: {
        ...prev.reviewedChapters,
        [chapterId]: !prev.reviewedChapters[chapterId],
      },
      lastUpdatedAt: new Date().toISOString(),
    }));
  }, []);

  const setNote = useCallback((chapterId: string, note: string) => {
    setState((prev) => ({
      ...prev,
      notes: { ...prev.notes, [chapterId]: note },
      lastUpdatedAt: new Date().toISOString(),
    }));
  }, []);

  const isChapterReviewed = useCallback(
    (chapterId: string) => !!state.reviewedChapters[chapterId],
    [state.reviewedChapters]
  );

  const reviewedCount = Object.values(state.reviewedChapters).filter(
    Boolean
  ).length;

  const resetReview = useCallback(() => {
    setState({
      prId,
      reviewedChapters: {},
      notes: {},
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    });
  }, [prId]);

  return {
    state,
    toggleChapter,
    setNote,
    isChapterReviewed,
    reviewedCount,
    resetReview,
  };
}
