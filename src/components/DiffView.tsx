"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MessageSquare, Send, X, Loader2 } from "lucide-react";

interface DiffViewProps {
  diffContent: string;
  fileName: string;
  annotation?: string;
  githubUrl?: string;
  prInfo?: { owner: string; repo: string; number: number };
}

function classifyLine(line: string): "add" | "remove" | "context" | "header" {
  if (line.startsWith("@@")) return "header";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "remove";
  return "context";
}

function parseLineNumber(headerLine: string): number | null {
  const match = headerLine.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
  return match ? parseInt(match[1], 10) : null;
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

export function DiffView({
  diffContent,
  fileName,
  annotation,
  githubUrl,
  prInfo,
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

  // Track new-file line numbers for commenting
  const lineNumbers = useMemo(() => {
    let currentNewLine = 0;
    return lines.map((line) => {
      const type = classifyLine(line);
      if (type === "header") {
        currentNewLine = parseLineNumber(line) || 0;
        return null;
      }
      if (type === "remove") return null;
      const num = currentNewLine;
      currentNewLine++;
      return num;
    });
  }, [lines]);

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
        <pre className="text-sm leading-6">
          {lines.map((line, i) => {
            const type = classifyLine(line);
            const lineNum = lineNumbers[i];
            const canComment = prInfo && lineNum !== null && type !== "header";
            const hasComment = lineNum !== null && postedComments.has(lineNum);
            let bg = "";
            let textColor = "text-zinc-400";

            if (type === "add") {
              bg = "bg-green-950/40";
              textColor = "text-green-300";
            } else if (type === "remove") {
              bg = "bg-red-950/40";
              textColor = "text-red-300";
            } else if (type === "header") {
              bg = "bg-blue-950/30";
              textColor = "text-blue-400";
            }

            return (
              <div key={i}>
                <div
                  className={`px-4 ${bg} ${textColor} font-mono flex items-center group/line ${
                    canComment ? "cursor-pointer hover:brightness-125" : ""
                  }`}
                  onClick={() => {
                    if (canComment && lineNum !== null) {
                      setCommentLine(commentLine === lineNum ? null : lineNum);
                    }
                  }}
                >
                  <span className="w-10 text-right mr-3 text-zinc-700 text-xs select-none flex-shrink-0">
                    {lineNum || ""}
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
                {commentLine === lineNum && lineNum !== null && (
                  <CommentForm
                    onSubmit={handleComment}
                    onCancel={() => setCommentLine(null)}
                    loading={commentLoading}
                  />
                )}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
