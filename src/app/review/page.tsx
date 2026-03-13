"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { NarrativeReview } from "@/lib/types";
import { ReviewContainer } from "@/components/ReviewContainer";
import { Loader2 } from "lucide-react";

function ReviewContent() {
  const searchParams = useSearchParams();
  const prUrl = searchParams.get("pr");
  const [review, setReview] = useState<NarrativeReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Preparing...");

  useEffect(() => {
    if (!prUrl) return;

    async function analyze() {
      setLoading(true);
      setError(null);

      try {
        setStatus("Fetching PR diff and metadata...");
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: prUrl }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        setStatus("Building narrative...");
        const data: NarrativeReview = await res.json();
        setReview(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    analyze();
  }, [prUrl]);

  if (!prUrl) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500">No PR URL provided. Go back and enter one.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-300 text-lg font-medium">{status}</p>
          <p className="text-zinc-500 text-sm mt-2">
            Analyzing changes and building your narrative review...
          </p>
          <p className="text-zinc-600 text-xs mt-4">
            This may take 30-60 seconds for large PRs
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg font-medium mb-2">
            Analysis Failed
          </p>
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <a
            href="/"
            className="text-indigo-400 hover:text-indigo-300 text-sm underline"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  if (!review) return null;

  return <ReviewContainer review={review} />;
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
