"use client";

import { Chapter } from "@/lib/types";
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";

interface ChapterTimelineProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  isChapterReviewed: (id: string) => boolean;
  onSelectChapter: (id: string) => void;
}

export function ChapterTimeline({
  chapters,
  activeChapterId,
  isChapterReviewed,
  onSelectChapter,
}: ChapterTimelineProps) {
  return (
    <nav className="space-y-1">
      {chapters.map((chapter, i) => {
        const isActive = chapter.id === activeChapterId;
        const reviewed = isChapterReviewed(chapter.id);
        const isUncategorized = chapter.id === "uncategorized";

        return (
          <button
            key={chapter.id}
            onClick={() => onSelectChapter(chapter.id)}
            className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
              isActive
                ? "bg-zinc-800/80 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-300"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {reviewed ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : isUncategorized ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <Circle className="w-4 h-4 text-zinc-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono ${
                    isUncategorized ? "text-amber-500" : "text-zinc-500"
                  }`}
                >
                  {isUncategorized ? "!" : i + 1}
                </span>
                <span className="truncate font-medium">{chapter.title}</span>
              </div>
              <span className="text-xs text-zinc-600 mt-0.5 block">
                {chapter.hunks.length} change{chapter.hunks.length !== 1 ? "s" : ""}
                {" · "}
                {new Set(chapter.hunks.map((h) => h.file)).size} file
                {new Set(chapter.hunks.map((h) => h.file)).size !== 1 ? "s" : ""}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
