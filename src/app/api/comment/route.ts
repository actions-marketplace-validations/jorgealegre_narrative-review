import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST(request: Request) {
  try {
    const { owner, repo, number, path, line, body, side } = await request.json();

    if (!owner || !repo || !number || !path || !body) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      body,
      path,
      subject_type: "line",
      side: side || "RIGHT",
    };

    if (line) {
      payload.line = line;
    }

    const commitSha = execSync(
      `gh pr view ${number} --repo ${owner}/${repo} --json headRefOid --jq .headRefOid`,
      { encoding: "utf-8" }
    ).trim();

    payload.commit_id = commitSha;

    const result = execSync(
      `gh api repos/${owner}/${repo}/pulls/${number}/comments -X POST --input -`,
      {
        encoding: "utf-8",
        input: JSON.stringify(payload),
      }
    );

    const comment = JSON.parse(result);
    return NextResponse.json({
      id: comment.id,
      html_url: comment.html_url,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
