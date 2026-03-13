"use client";

import { useMemo } from "react";

interface DiffViewProps {
  diffContent: string;
  fileName: string;
  annotation?: string;
}

function classifyLine(line: string): "add" | "remove" | "context" | "header" {
  if (line.startsWith("@@")) return "header";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "remove";
  return "context";
}

export function DiffView({ diffContent, fileName, annotation }: DiffViewProps) {
  const lines = useMemo(() => {
    return diffContent.split("\n").filter((l) => {
      // Skip diff headers, we show file name separately
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

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden mb-3">
      <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 border-b border-zinc-800">
        <span className="text-sm font-mono text-zinc-300">{fileName}</span>
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
              <div key={i} className={`px-4 ${bg} ${textColor} font-mono`}>
                {line || " "}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
