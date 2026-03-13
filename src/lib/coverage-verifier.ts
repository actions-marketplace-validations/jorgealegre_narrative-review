import { ParsedDiff, Chapter, ChapterHunk, CoverageResult } from "./types";

/**
 * Deterministic verification that every hunk in the original diff
 * is accounted for in exactly one chapter. No LLM involved.
 */
export function verifyCoverage(
  diff: ParsedDiff,
  chapters: Chapter[]
): CoverageResult {
  // Build a set of all (file, hunkIndex) pairs from the original diff
  const allHunks = new Map<string, { file: string; hunkIndex: number; rawContent: string }>();
  for (const file of diff.files) {
    for (let i = 0; i < file.hunks.length; i++) {
      const key = `${file.path}::${i}`;
      allHunks.set(key, { file: file.path, hunkIndex: i, rawContent: file.hunks[i].rawContent });
    }
  }

  // Mark hunks claimed by chapters (only count valid references)
  const claimed = new Set<string>();
  for (const chapter of chapters) {
    for (const hunk of chapter.hunks) {
      const key = `${hunk.file}::${hunk.hunkIndex}`;
      if (allHunks.has(key)) {
        claimed.add(key);
      }
    }
  }

  // Find uncovered
  const uncoveredHunks: CoverageResult["uncoveredHunks"] = [];
  for (const [key, info] of allHunks) {
    if (!claimed.has(key)) {
      uncoveredHunks.push(info);
    }
  }

  const coveredFiles = new Set<string>();
  const allFiles = new Set<string>();
  for (const file of diff.files) {
    allFiles.add(file.path);
  }
  for (const chapter of chapters) {
    for (const hunk of chapter.hunks) {
      coveredFiles.add(hunk.file);
    }
  }

  return {
    totalFiles: allFiles.size,
    coveredFiles: coveredFiles.size,
    totalHunks: allHunks.size,
    coveredHunks: claimed.size,
    uncoveredHunks,
    isComplete: uncoveredHunks.length === 0,
  };
}

/**
 * Create a synthetic "Uncategorized Changes" chapter from uncovered hunks.
 */
export function buildUncategorizedChapter(
  coverage: CoverageResult
): Chapter | null {
  if (coverage.isComplete) return null;

  return {
    id: "uncategorized",
    title: "Uncategorized Changes",
    narrative:
      "These changes were not categorized into a narrative chapter by the analysis. " +
      "Review them to ensure nothing was missed.",
    safetyNotes: [
      `${coverage.uncoveredHunks.length} hunk(s) across ${new Set(coverage.uncoveredHunks.map((h) => h.file)).size} file(s) were not assigned to any chapter.`,
    ],
    hunks: coverage.uncoveredHunks.map(
      (h): ChapterHunk => ({
        file: h.file,
        hunkIndex: h.hunkIndex,
        diffContent: h.rawContent,
      })
    ),
  };
}
