"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  GitPullRequest,
  ArrowRight,
  Zap,
  Brain,
  Sparkles,
  GitBranch,
  FolderGit2,
  Loader2,
} from "lucide-react";
import { ModelId } from "@/lib/types";

type SourceMode = "pr" | "local";

const MODELS: {
  id: ModelId;
  name: string;
  desc: string;
  icon: typeof Zap;
  cost: string;
}[] = [
  {
    id: "claude-3-5-haiku-20241022",
    name: "Haiku",
    desc: "Fast & cheap",
    icon: Zap,
    cost: "~$0.01",
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Sonnet",
    desc: "Balanced",
    icon: Sparkles,
    cost: "~$0.10",
  },
  {
    id: "claude-opus-4-20250514",
    name: "Opus",
    desc: "Deepest analysis",
    icon: Brain,
    cost: "~$0.50",
  },
];

export default function Home() {
  const [mode, setMode] = useState<SourceMode>("pr");
  const [url, setUrl] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [headBranch, setHeadBranch] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState("");
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [model, setModel] = useState<ModelId>("claude-sonnet-4-20250514");
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchBranches = useCallback(async (path: string) => {
    if (!path.trim()) return;
    setLoadingBranches(true);
    setError("");
    try {
      const res = await fetch("/api/local-branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoPath: path }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to read repo");
      }
      const data = await res.json();
      setBranches(data.branches);
      setCurrentBranch(data.current);
      setRepoPath(data.root);
      if (!headBranch) setHeadBranch(data.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read repository");
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  }, [headBranch]);

  // Auto-detect branches when repoPath changes (debounced)
  useEffect(() => {
    if (mode !== "local" || !repoPath.trim()) return;
    const timer = setTimeout(() => fetchBranches(repoPath), 500);
    return () => clearTimeout(timer);
  }, [repoPath, mode, fetchBranches]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "pr") {
      const match = url.match(/github\.com\/[^/]+\/[^/]+\/pull\/\d+/);
      if (!match) {
        setError("Please enter a valid GitHub PR URL");
        return;
      }
      router.push(
        `/review?pr=${encodeURIComponent(url)}&model=${encodeURIComponent(model)}`
      );
    } else {
      if (!repoPath.trim()) {
        setError("Please enter a repository path");
        return;
      }
      const params = new URLSearchParams({
        source: "local",
        repo: repoPath,
        model,
      });
      if (baseBranch) params.set("base", baseBranch);
      if (headBranch) params.set("head", headBranch);
      router.push(`/review?${params.toString()}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-xl">
          {/* Logo / title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <BookOpen className="w-10 h-10 text-indigo-500" />
            </div>
            <h1 className="text-4xl font-bold text-zinc-100 mb-3">
              Narrative Review
            </h1>
            <p className="text-zinc-400 text-lg max-w-md mx-auto">
              Code review as a story, not a file list. Understand{" "}
              <em className="text-zinc-300">why</em> changes happened, in the
              order they make sense.
            </p>
          </div>

          {/* Source mode tabs */}
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 mb-4">
            <button
              type="button"
              onClick={() => { setMode("pr"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm transition-colors ${
                mode === "pr"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <GitPullRequest className="w-4 h-4" />
              GitHub PR
            </button>
            <button
              type="button"
              onClick={() => { setMode("local"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm transition-colors ${
                mode === "local"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              Local Branch
            </button>
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "pr" ? (
              <div className="relative">
                <GitPullRequest className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError("");
                  }}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-lg"
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Repo path */}
                <div className="relative">
                  <FolderGit2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    value={repoPath}
                    onChange={(e) => {
                      setRepoPath(e.target.value);
                      setError("");
                    }}
                    placeholder="/Users/you/Developer/your-project"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-lg"
                    autoFocus
                  />
                  {loadingBranches && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
                  )}
                </div>

                {/* Branch selectors */}
                {branches.length > 0 && (
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-zinc-500 px-1">
                        Base (compare against)
                      </label>
                      <div className="relative">
                        <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <select
                          value={baseBranch}
                          onChange={(e) => setBaseBranch(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                        >
                          <option value="">auto-detect</option>
                          {branches.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-end pb-2.5 text-zinc-700">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-zinc-500 px-1">
                        Head (your changes)
                      </label>
                      <div className="relative">
                        <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        <select
                          value={headBranch}
                          onChange={(e) => setHeadBranch(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                        >
                          {branches.map((b) => (
                            <option key={b} value={b}>
                              {b}{b === currentBranch ? " (current)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {currentBranch && (
                  <p className="text-xs text-zinc-600 px-1">
                    Comparing{" "}
                    <span className="text-zinc-400">{headBranch || currentBranch}</span>
                    {" "}against{" "}
                    <span className="text-zinc-400">{baseBranch || "auto-detected base"}</span>
                  </p>
                )}
              </div>
            )}

            {/* Model selector */}
            <div className="flex gap-2">
              {MODELS.map((m) => {
                const Icon = m.icon;
                const selected = model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      selected
                        ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs opacity-60">
                        {m.desc} &middot; {m.cost}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && <p className="text-red-400 text-sm px-1">{error}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
            >
              {mode === "pr" ? "Analyze PR" : "Analyze Branch"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* How it works */}
          <div className="mt-16 grid grid-cols-3 gap-6 text-center">
            {(mode === "pr"
              ? [
                  { step: "1", title: "Paste PR URL", desc: "Any GitHub pull request" },
                  { step: "2", title: "AI Analysis", desc: "Builds the narrative order" },
                  { step: "3", title: "Review Story", desc: "Check off chapters, approve" },
                ]
              : [
                  { step: "1", title: "Point to repo", desc: "Any local git repository" },
                  { step: "2", title: "Pick branches", desc: "Compare head vs base" },
                  { step: "3", title: "Review Story", desc: "Understand before pushing" },
                ]
            ).map((item) => (
              <div key={item.step}>
                <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-sm font-bold mx-auto mb-2">
                  {item.step}
                </div>
                <p className="text-zinc-300 text-sm font-medium">
                  {item.title}
                </p>
                <p className="text-zinc-600 text-xs mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-4 text-center">
        <p className="text-zinc-700 text-xs">
          Powered by Claude &middot; Diffs via {mode === "pr" ? "gh CLI" : "local git"}
        </p>
      </footer>
    </div>
  );
}
