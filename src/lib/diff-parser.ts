import { DiffFile, DiffHunk, ParsedDiff } from "./types";

export function parseDiff(rawDiff: string): ParsedDiff {
  const files: DiffFile[] = [];
  const fileSections = rawDiff.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const file = parseFileSection(section);
    if (file) files.push(file);
  }

  return {
    files,
    totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
    rawDiff,
  };
}

function parseFileSection(section: string): DiffFile | null {
  const lines = section.split("\n");
  const headerLine = lines[0] || "";

  const pathMatch = headerLine.match(/a\/(.+?) b\/(.+)/);
  if (!pathMatch) return null;

  const oldPath = pathMatch[1];
  const newPath = pathMatch[2];

  let status: DiffFile["status"] = "modified";
  if (section.includes("new file mode")) {
    status = "added";
  } else if (section.includes("deleted file mode")) {
    status = "removed";
  } else if (oldPath !== newPath) {
    status = "renamed";
  }

  const hunks = parseHunks(section);
  let additions = 0;
  let deletions = 0;

  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.startsWith("+")) additions++;
      else if (line.startsWith("-")) deletions++;
    }
  }

  return {
    path: newPath,
    status,
    oldPath: oldPath !== newPath ? oldPath : undefined,
    hunks,
    additions,
    deletions,
  };
}

function parseHunks(section: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const hunkRegex = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)$/gm;
  let match;
  const hunkStarts: { index: number; header: string; oldStart: number; newStart: number }[] = [];

  while ((match = hunkRegex.exec(section)) !== null) {
    hunkStarts.push({
      index: match.index,
      header: match[0],
      oldStart: parseInt(match[1], 10),
      newStart: parseInt(match[2], 10),
    });
  }

  for (let i = 0; i < hunkStarts.length; i++) {
    const start = hunkStarts[i];
    const end = i + 1 < hunkStarts.length ? hunkStarts[i + 1].index : section.length;
    const hunkText = section.slice(start.index, end);
    const hunkLines = hunkText.split("\n");
    const contentLines = hunkLines.slice(1).filter((l) => l.length > 0);

    hunks.push({
      header: start.header,
      lines: contentLines,
      rawContent: hunkText.trim(),
      startLineOld: start.oldStart,
      startLineNew: start.newStart,
    });
  }

  return hunks;
}

/**
 * Reconstruct unified diff text for a specific file + hunk,
 * suitable for rendering with diff2html.
 */
export function reconstructDiffForHunk(
  file: DiffFile,
  hunkIndex: number
): string {
  const hunk = file.hunks[hunkIndex];
  if (!hunk) return "";

  const header = `diff --git a/${file.oldPath || file.path} b/${file.path}`;
  const fromFile = `--- a/${file.oldPath || file.path}`;
  const toFile = `+++ b/${file.path}`;

  return [header, fromFile, toFile, hunk.rawContent].join("\n");
}
