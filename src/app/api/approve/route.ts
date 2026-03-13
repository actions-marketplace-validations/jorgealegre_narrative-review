import { NextResponse } from "next/server";
import { approvePR, requestChangesPR } from "@/lib/github";

export async function POST(request: Request) {
  try {
    const { owner, repo, number, action, body } = await request.json();

    if (!owner || !repo || !number || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      approvePR(owner, repo, number, body || "Reviewed via Narrative Review");
    } else if (action === "request-changes") {
      requestChangesPR(owner, repo, number, body || "Changes requested");
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
