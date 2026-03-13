"use client";

import { CoverageResult } from "@/lib/types";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface ProgressTrackerProps {
  reviewedCount: number;
  totalChapters: number;
  coverage: CoverageResult;
  prTitle: string;
  prUrl: string;
}

export function ProgressTracker({
  reviewedCount,
  totalChapters,
  coverage,
  prTitle,
  prUrl,
}: ProgressTrackerProps) {
  const percentage =
    totalChapters > 0 ? Math.round((reviewedCount / totalChapters) * 100) : 0;
  const allReviewed = reviewedCount === totalChapters && totalChapters > 0;

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-zinc-100 hover:text-indigo-400 transition-colors"
            >
              {prTitle}
            </a>
          </div>
          <div className="flex items-center gap-4">
            {/* Coverage indicator */}
            <div className="flex items-center gap-1.5">
              {coverage.isComplete ? (
                <ShieldCheck className="w-4 h-4 text-green-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              <span
                className={`text-xs font-mono ${
                  coverage.isComplete ? "text-green-400" : "text-amber-400"
                }`}
              >
                {coverage.coveredHunks}/{coverage.totalHunks} hunks
                {coverage.isComplete ? " covered" : " — gaps found"}
              </span>
            </div>
            {/* Review progress */}
            <span className="text-sm text-zinc-400">
              {reviewedCount}/{totalChapters} chapters
            </span>
            <span
              className={`text-sm font-bold ${
                allReviewed ? "text-green-400" : "text-zinc-300"
              }`}
            >
              {percentage}%
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allReviewed ? "bg-green-500" : "bg-indigo-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
