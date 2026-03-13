import { NextResponse } from "next/server";
import {
  resolveRepoPath,
  getDefaultBranch,
  getLocalDiff,
  getLocalMetadata,
} from "@/lib/local-git";
import { parseDiff } from "@/lib/diff-parser";
import { analyzeNarrative } from "@/lib/analyzer";
import {
  verifyCoverage,
  buildUncategorizedChapter,
} from "@/lib/coverage-verifier";
import { NarrativeReview } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { repoPath, baseBranch, headBranch, model } = await request.json();

    if (!repoPath || typeof repoPath !== "string") {
      return NextResponse.json(
        { error: "Missing repository path" },
        { status: 400 }
      );
    }

    const resolvedPath = resolveRepoPath(repoPath);
    const base = baseBranch || getDefaultBranch(resolvedPath);

    const rawDiff = getLocalDiff(resolvedPath, base, headBranch || undefined);

    if (!rawDiff.trim()) {
      return NextResponse.json(
        { error: `No changes found between ${base} and ${headBranch || "HEAD"}` },
        { status: 400 }
      );
    }

    const prInfo = getLocalMetadata(resolvedPath, base, headBranch || undefined);
    const diff = parseDiff(rawDiff);

    const analysis = await analyzeNarrative(diff, prInfo.title, prInfo.body, {
      model,
    });

    const coverage = verifyCoverage(diff, analysis.chapters);

    const chapters = [...analysis.chapters];
    const uncategorized = buildUncategorizedChapter(coverage);
    if (uncategorized) {
      chapters.push(uncategorized);
    }

    const review: NarrativeReview = {
      prInfo,
      title: analysis.title,
      summary: analysis.summary,
      rootCause: analysis.rootCause,
      chapters,
      coverage,
      metrics: analysis.metrics,
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json(review);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Local analysis failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
