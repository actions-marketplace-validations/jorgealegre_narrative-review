"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MessageSquare, Send, Loader2 } from "lucide-react";
import { DiffSettings } from "@/lib/types";

interface DiffViewProps {
  diffContent: string;
  fileName: string;
  annotation?: string;
  githubUrl?: string;
  prInfo?: { owner: string; repo: string; number: number };
  settings?: DiffSettings;
}

function classifyLine(line: string): "add" | "remove" | "context" | "header" {
  if (line.startsWith("@@")) return "header";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "remove";
  return "context";
}

function parseHunkHeader(headerLine: string): { oldStart: number; newStart: number } | null {
  const match = headerLine.match(/@@ -(\d+)(?:,\d+)? \+(\d+)/);
  if (!match) return null;
  return { oldStart: parseInt(match[1], 10), newStart: parseInt(match[2], 10) };
}

function isWhitespaceOnly(line: string): boolean {
  const content = line.slice(1); // strip the +/- prefix
  return content.trim().length === 0;
}

/**
 * Detects pairs of adjacent remove/add lines that differ only in whitespace.
 * Returns a Set of indices that should be hidden.
 */
function findWhitespaceOnlyChanges(lines: string[]): Set<number> {
  const hidden = new Set<number>();
  let i = 0;
  while (i < lines.length) {
    const type = classifyLine(lines[i]);
    if (type === "remove") {
      // Collect consecutive removes
      const removeStart = i;
      while (i < lines.length && classifyLine(lines[i]) === "remove") i++;
      // Collect consecutive adds
      const addStart = i;
      while (i < lines.length && classifyLine(lines[i]) === "add") i++;
      const removeEnd = addStart;
      const addEnd = i;

      const removeCount = removeEnd - removeStart;
      const addCount = addEnd - addStart;

      if (removeCount === addCount && removeCount > 0) {
        let allWhitespace = true;
        for (let j = 0; j < removeCount; j++) {
          const oldContent = lines[removeStart + j].slice(1);
          const newContent = lines[addStart + j].slice(1);
          if (oldContent.trim() !== newContent.trim()) {
            allWhitespace = false;
            break;
          }
        }
        if (allWhitespace) {
          for (let j = removeStart; j < addEnd; j++) hidden.add(j);
        }
      }
    } else if (type === "add" && isWhitespaceOnly(lines[i])) {
      hidden.add(i);
      i++;
    } else {
      i++;
    }
  }
  return hidden;
}

interface CommentFormProps {
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

function CommentForm({ onSubmit, onCancel, loading }: CommentFormProps) {
  const [text, setText] = useState("");

  return (
    <div className="bg-zinc-800/80 border border-zinc-700 rounded-lg mx-4 my-1 p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a comment..."
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none"
        rows={3}
        autoFocus
        disabled={loading}
      />
      <div className="flex items-center justify-end gap-2 mt-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={() => text.trim() && onSubmit(text.trim())}
          disabled={!text.trim() || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Send className="w-3 h-3" />
          )}
          Comment on GitHub
        </button>
      </div>
    </div>
  );
}

// ── Unified / Compact view ──────────────────────────────────────────────

function UnifiedDiffLines({
  lines,
  settings,
  prInfo,
  fileName,
  commentLine,
  setCommentLine,
  commentLoading,
  postedComments,
  handleComment,
}: {
  lines: string[];
  settings: DiffSettings;
  prInfo?: { owner: string; repo: string; number: number };
  fileName: string;
  commentLine: number | null;
  setCommentLine: (v: number | null) => void;
  commentLoading: boolean;
  postedComments: Set<number>;
  handleComment: (body: string) => Promise<void>;
}) {
  const whitespaceHidden = useMemo(
    () => (settings.hideWhitespace ? findWhitespaceOnlyChanges(lines) : new Set<number>()),
    [lines, settings.hideWhitespace]
  );

  const lineNumbers = useMemo(() => {
    let currentOld = 0;
    let currentNew = 0;
    return lines.map((line) => {
      const type = classifyLine(line);
      if (type === "header") {
        const parsed = parseHunkHeader(line);
        if (parsed) {
          currentOld = parsed.oldStart;
          currentNew = parsed.newStart;
        }
        return { old: null, new: null };
      }
      if (type === "remove") {
        const num = currentOld;
        currentOld++;
        return { old: num, new: null };
      }
      if (type === "add") {
        const num = currentNew;
        currentNew++;
        return { old: null, new: num };
      }
      const o = currentOld;
      const n = currentNew;
      currentOld++;
      currentNew++;
      return { old: o, new: n };
    });
  }, [lines]);

  // In compact mode, collapse runs of context lines to at most 2 at each boundary
  const visibleIndices = useMemo(() => {
    if (settings.viewMode !== "compact") {
      return lines.map((_, i) => i).filter((i) => !whitespaceHidden.has(i));
    }

    const contextBoundary = 2;
    const visible = new Set<number>();
    const types = lines.map((l) => classifyLine(l));

    for (let i = 0; i < lines.length; i++) {
      if (whitespaceHidden.has(i)) continue;
      if (types[i] !== "context") {
        visible.add(i);
        // include surrounding context
        for (let j = Math.max(0, i - contextBoundary); j <= Math.min(lines.length - 1, i + contextBoundary); j++) {
          if (!whitespaceHidden.has(j)) visible.add(j);
        }
      }
      if (types[i] === "header") visible.add(i);
    }

    return Array.from(visible).sort((a, b) => a - b);
  }, [lines, settings.viewMode, whitespaceHidden]);

  let prevIdx = -1;

  return (
    <>
      {visibleIndices.map((i) => {
        const line = lines[i];
        const type = classifyLine(line);
        const nums = lineNumbers[i];
        const newLineNum = nums.new;
        const canComment = prInfo && newLineNum !== null && type !== "header";
        const hasComment = newLineNum !== null && postedComments.has(newLineNum);

        let bg = "";
        let textColor = "text-zinc-400";
        if (type === "add") { bg = "bg-green-950/40"; textColor = "text-green-300"; }
        else if (type === "remove") { bg = "bg-red-950/40"; textColor = "text-red-300"; }
        else if (type === "header") { bg = "bg-blue-950/30"; textColor = "text-blue-400"; }

        // Show a collapse indicator when indices are non-contiguous
        const showGap = prevIdx >= 0 && i - prevIdx > 1 && settings.viewMode === "compact";
        prevIdx = i;

        return (
          <div key={i}>
            {showGap && (
              <div className="bg-zinc-900/60 text-zinc-600 text-xs text-center py-0.5 border-y border-zinc-800/50 select-none">
                ⋯
              </div>
            )}
            <div
              className={`px-4 ${bg} ${textColor} font-mono flex items-center group/line ${
                canComment ? "cursor-pointer hover:brightness-125" : ""
              }`}
              onClick={() => {
                if (canComment && newLineNum !== null) {
                  setCommentLine(commentLine === newLineNum ? null : newLineNum);
                }
              }}
            >
              <span className="w-8 text-right mr-1 text-zinc-700 text-xs select-none flex-shrink-0">
                {nums.old ?? ""}
              </span>
              <span className="w-8 text-right mr-3 text-zinc-700 text-xs select-none flex-shrink-0">
                {nums.new ?? ""}
              </span>
              <span className="flex-1">{line || " "}</span>
              {canComment && (
                <span className="opacity-0 group-hover/line:opacity-100 transition-opacity ml-2 flex-shrink-0">
                  {hasComment ? (
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </span>
              )}
            </div>
            {commentLine === newLineNum && newLineNum !== null && (
              <CommentForm
                onSubmit={handleComment}
                onCancel={() => setCommentLine(null)}
                loading={commentLoading}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// ── Split (side-by-side) view ───────────────────────────────────────────

interface SplitPair {
  oldLine: string | null;
  newLine: string | null;
  oldNum: number | null;
  newNum: number | null;
  type: "context" | "change" | "header";
}

function buildSplitPairs(lines: string[], whitespaceHidden: Set<number>): SplitPair[] {
  const pairs: SplitPair[] = [];
  let oldNum = 0;
  let newNum = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const type = classifyLine(line);

    if (type === "header") {
      const parsed = parseHunkHeader(line);
      if (parsed) { oldNum = parsed.oldStart; newNum = parsed.newStart; }
      pairs.push({ oldLine: line, newLine: line, oldNum: null, newNum: null, type: "header" });
      i++;
      continue;
    }

    if (type === "context") {
      if (!whitespaceHidden.has(i)) {
        pairs.push({ oldLine: line, newLine: line, oldNum: oldNum, newNum: newNum, type: "context" });
      }
      oldNum++;
      newNum++;
      i++;
      continue;
    }

    // Collect consecutive remove/add block
    const removes: { line: string; num: number; idx: number }[] = [];
    const adds: { line: string; num: number; idx: number }[] = [];

    while (i < lines.length && classifyLine(lines[i]) === "remove") {
      removes.push({ line: lines[i], num: oldNum, idx: i });
      oldNum++;
      i++;
    }
    while (i < lines.length && classifyLine(lines[i]) === "add") {
      adds.push({ line: lines[i], num: newNum, idx: i });
      newNum++;
      i++;
    }

    const maxLen = Math.max(removes.length, adds.length);
    for (let j = 0; j < maxLen; j++) {
      const rm = j < removes.length ? removes[j] : null;
      const ad = j < adds.length ? adds[j] : null;

      // If both sides are hidden as whitespace-only, skip
      if (rm && ad && whitespaceHidden.has(rm.idx) && whitespaceHidden.has(ad.idx)) continue;

      pairs.push({
        oldLine: rm ? rm.line : null,
        newLine: ad ? ad.line : null,
        oldNum: rm ? rm.num : null,
        newNum: ad ? ad.num : null,
        type: "change",
      });
    }
  }
  return pairs;
}

function SplitDiffView({
  lines,
  settings,
}: {
  lines: string[];
  settings: DiffSettings;
}) {
  const whitespaceHidden = useMemo(
    () => (settings.hideWhitespace ? findWhitespaceOnlyChanges(lines) : new Set<number>()),
    [lines, settings.hideWhitespace]
  );
  const pairs = useMemo(() => buildSplitPairs(lines, whitespaceHidden), [lines, whitespaceHidden]);

  return (
    <div className="grid grid-cols-2 divide-x divide-zinc-800">
      {/* Left (old) */}
      <div>
        {pairs.map((pair, i) => {
          if (pair.type === "header") {
            return (
              <div key={i} className="bg-blue-950/30 text-blue-400 font-mono text-xs px-3 py-1 truncate">
                {pair.oldLine}
              </div>
            );
          }
          const hasOld = pair.oldLine !== null;
          const isRemove = hasOld && classifyLine(pair.oldLine!) === "remove";
          return (
            <div
              key={i}
              className={`font-mono flex items-center min-h-[1.5rem] text-sm ${
                isRemove
                  ? "bg-red-950/40 text-red-300"
                  : hasOld
                  ? "text-zinc-400"
                  : "bg-zinc-900/30"
              }`}
            >
              <span className="w-8 text-right mr-3 text-zinc-700 text-xs select-none flex-shrink-0 px-1">
                {pair.oldNum ?? ""}
              </span>
              <span className="flex-1 truncate px-2">
                {hasOld ? pair.oldLine || " " : ""}
              </span>
            </div>
          );
        })}
      </div>
      {/* Right (new) */}
      <div>
        {pairs.map((pair, i) => {
          if (pair.type === "header") {
            return (
              <div key={i} className="bg-blue-950/30 text-blue-400 font-mono text-xs px-3 py-1 truncate">
                {pair.newLine}
              </div>
            );
          }
          const hasNew = pair.newLine !== null;
          const isAdd = hasNew && classifyLine(pair.newLine!) === "add";
          return (
            <div
              key={i}
              className={`font-mono flex items-center min-h-[1.5rem] text-sm ${
                isAdd
                  ? "bg-green-950/40 text-green-300"
                  : hasNew
                  ? "text-zinc-400"
                  : "bg-zinc-900/30"
              }`}
            >
              <span className="w-8 text-right mr-3 text-zinc-700 text-xs select-none flex-shrink-0 px-1">
                {pair.newNum ?? ""}
              </span>
              <span className="flex-1 truncate px-2">
                {hasNew ? pair.newLine || " " : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main DiffView ───────────────────────────────────────────────────────

const DEFAULT_SETTINGS: DiffSettings = { hideWhitespace: false, viewMode: "unified" };

export function DiffView({
  diffContent,
  fileName,
  annotation,
  githubUrl,
  prInfo,
  settings = DEFAULT_SETTINGS,
}: DiffViewProps) {
  const [commentLine, setCommentLine] = useState<number | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [postedComments, setPostedComments] = useState<Set<number>>(new Set());

  const lines = useMemo(() => {
    return diffContent.split("\n").filter((l) => {
      if (l.startsWith("diff --git")) return false;
      if (l.startsWith("index ")) return false;
      if (l.startsWith("---")) return false;
      if (l.startsWith("+++")) return false;
      if (l.startsWith("new file")) return false;
      if (l.startsWith("deleted file")) return false;
      if (l.startsWith("similarity index")) return false;
      if (l.startsWith("rename from")) return false;
      if (l.startsWith("rename to")) return false;
      return true;
    });
  }, [diffContent]);

  const handleComment = async (body: string) => {
    if (!prInfo || commentLine === null) return;
    setCommentLoading(true);
    try {
      const res = await fetch("/api/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: prInfo.owner,
          repo: prInfo.repo,
          number: prInfo.number,
          path: fileName,
          line: commentLine,
          body,
        }),
      });
      if (res.ok) {
        setPostedComments((prev) => new Set([...prev, commentLine]));
        setCommentLine(null);
      }
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden mb-3 group">
      <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 border-b border-zinc-800">
        <span className="text-sm font-mono text-zinc-300">{fileName}</span>
        <div className="flex items-center gap-2">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300"
              title="View on GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
      {annotation && (
        <div className="bg-indigo-950/30 border-b border-zinc-800 px-4 py-2">
          <p className="text-sm text-indigo-300 italic">{annotation}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        {settings.viewMode === "split" ? (
          <SplitDiffView lines={lines} settings={settings} />
        ) : (
          <pre className="text-sm leading-6">
            <UnifiedDiffLines
              lines={lines}
              settings={settings}
              prInfo={prInfo}
              fileName={fileName}
              commentLine={commentLine}
              setCommentLine={setCommentLine}
              commentLoading={commentLoading}
              postedComments={postedComments}
              handleComment={handleComment}
            />
          </pre>
        )}
      </div>
    </div>
  );
}
