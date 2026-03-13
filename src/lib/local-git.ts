import { execSync } from "child_process";
import { PRInfo } from "./types";

function exec(cmd: string, cwd: string): string {
  return execSync(cmd, { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024, cwd });
}

function tryExec(cmd: string, cwd: string): string | null {
  try {
    return exec(cmd, cwd).trim();
  } catch {
    return null;
  }
}

export function resolveRepoPath(repoPath: string): string {
  const root = exec("git rev-parse --show-toplevel", repoPath).trim();
  return root;
}

export function getCurrentBranch(repoPath: string): string {
  return exec("git rev-parse --abbrev-ref HEAD", repoPath).trim();
}

export function getDefaultBranch(repoPath: string): string {
  // Try common defaults, then fall back to whatever the first remote HEAD points to
  for (const candidate of ["develop", "main", "master"]) {
    const exists = tryExec(`git rev-parse --verify ${candidate}`, repoPath);
    if (exists) return candidate;
  }
  const remoteHead = tryExec(
    "git symbolic-ref refs/remotes/origin/HEAD --short",
    repoPath
  );
  if (remoteHead) return remoteHead.replace("origin/", "");
  return "main";
}

export function getLocalDiff(repoPath: string, baseBranch: string, headBranch?: string): string {
  const head = headBranch || "HEAD";
  const mergeBase = exec(`git merge-base ${baseBranch} ${head}`, repoPath).trim();
  return exec(`git diff ${mergeBase}..${head}`, repoPath);
}

export function getLocalMetadata(
  repoPath: string,
  baseBranch: string,
  headBranch?: string
): PRInfo {
  const head = headBranch || "HEAD";
  const currentBranch = getCurrentBranch(repoPath);
  const mergeBase = exec(`git merge-base ${baseBranch} ${head}`, repoPath).trim();

  const diffStat = exec(`git diff --stat ${mergeBase}..${head}`, repoPath);

  // Parse "N files changed, X insertions(+), Y deletions(-)" from the last line
  const statLine = diffStat.trim().split("\n").pop() || "";
  const filesMatch = statLine.match(/(\d+) files? changed/);
  const addMatch = statLine.match(/(\d+) insertions?\(\+\)/);
  const delMatch = statLine.match(/(\d+) deletions?\(-\)/);

  // Build a title from the commit messages on the branch
  const logOutput = exec(
    `git log --oneline ${mergeBase}..${head}`,
    repoPath
  ).trim();
  const commits = logOutput.split("\n").filter(Boolean);
  const title =
    commits.length === 1
      ? commits[0].replace(/^[a-f0-9]+ /, "")
      : `${commits.length} commits on ${currentBranch}`;

  // Use all commit messages as the body
  const body = exec(
    `git log --format="- %s" ${mergeBase}..${head}`,
    repoPath
  ).trim();

  const author = exec("git config user.name", repoPath).trim() || "local";

  // Extract repo name from the path
  const repoName = repoPath.split("/").filter(Boolean).pop() || "local";

  // Try to find the remote owner/repo for GitHub links
  const remoteUrl = tryExec("git remote get-url origin", repoPath);
  let owner = "local";
  let repo = repoName;
  if (remoteUrl) {
    const ghMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (ghMatch) {
      owner = ghMatch[1];
      repo = ghMatch[2];
    }
  }

  return {
    owner,
    repo,
    number: 0, // sentinel for "local, no PR"
    title,
    body,
    author,
    additions: addMatch ? parseInt(addMatch[1], 10) : 0,
    deletions: delMatch ? parseInt(delMatch[1], 10) : 0,
    changedFiles: filesMatch ? parseInt(filesMatch[1], 10) : 0,
    baseRef: baseBranch,
    headRef: currentBranch,
  };
}
