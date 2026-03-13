"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, GitPullRequest, ArrowRight } from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const match = url.match(/github\.com\/[^/]+\/[^/]+\/pull\/\d+/);
    if (!match) {
      setError("Please enter a valid GitHub PR URL");
      return;
    }

    router.push(`/review?pr=${encodeURIComponent(url)}`);
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

          {/* Input form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
            {error && <p className="text-red-400 text-sm px-1">{error}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
            >
              Analyze PR
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* How it works */}
          <div className="mt-16 grid grid-cols-3 gap-6 text-center">
            {[
              {
                step: "1",
                title: "Paste PR URL",
                desc: "Any GitHub pull request",
              },
              {
                step: "2",
                title: "AI Analysis",
                desc: "Builds the narrative order",
              },
              {
                step: "3",
                title: "Review Story",
                desc: "Check off chapters, approve",
              },
            ].map((item) => (
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
          Powered by Claude &middot; Diffs via gh CLI
        </p>
      </footer>
    </div>
  );
}
