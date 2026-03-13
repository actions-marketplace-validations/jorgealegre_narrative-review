import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST(request: Request) {
  try {
    const { repoPath } = await request.json();
    if (!repoPath) {
      return NextResponse.json({ error: "Missing repoPath" }, { status: 400 });
    }

    const root = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      cwd: repoPath,
    }).trim();

    const current = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
      cwd: root,
    }).trim();

    const branchList = execSync(
      "git branch --format='%(refname:short)' --sort=-committerdate",
      { encoding: "utf-8", cwd: root }
    )
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(0, 30);

    return NextResponse.json({ root, current, branches: branchList });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
