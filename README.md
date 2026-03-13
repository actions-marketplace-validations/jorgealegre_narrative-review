# Narrative Review

**Code review as a story, not a file list.**

Narrative Review uses AI to reorder pull request diffs into a causal narrative — starting from the root cause and building outward — so reviewers understand *why* changes happened, not just *what* changed.

![Landing Page](docs/landing.png)

---

## Why

GitHub's default PR view lists files alphabetically. When a PR deletes a view, you don't know *who called that view* until you scroll past twenty other files. When a feature flag is removed, the cascading deletions make no sense without seeing the flag removal first.

Narrative Review fixes this. It feeds your entire diff to Claude, which identifies the root cause, traces the dependency chain, and groups changes into chapters ordered by causality — like a technical document that walks you through the reasoning.

## Features

### Core Analysis
- **Narrative ordering** — AI reorders diff hunks into causal chapters, root cause first
- **100% coverage verification** — deterministic check ensures every hunk appears in at least one chapter; uncovered changes get a flagged "Uncategorized" chapter
- **Safety annotations** — per-chapter notes flag potential risks, breaking changes, or things to watch
- **Connection threading** — each chapter explains how it relates to the previous one

### Input Sources
- **GitHub PRs** — paste any PR URL; fetches diff and metadata via `gh` CLI
- **Local branches** — point to a local repo, pick base/head branches, review before pushing
- **Auto-detection** — local mode auto-discovers branches and guesses the default base

### Review Experience
- **Chapter-by-chapter progress** — mark chapters as reviewed, track completion percentage
- **Chapter notes** — jot down thoughts on each chapter as you review
- **Walkthrough mode** — full-screen cinematic presentation that steps through chapters one at a time with transitions
- **Keyboard shortcuts** — `j`/`k` navigate, `Space` toggles reviewed, `n` jumps to next unreviewed
- **Expand/collapse all** — toggle all diff views open or closed at once

### Diff Viewing
- **Three view modes** — Unified (standard), Compact (collapses context), Split (side-by-side)
- **Hide whitespace** — filters out whitespace-only changes
- **Syntax-highlighted** — color-coded additions, removals, and context lines with line numbers
- **GitHub deep-links** — click through to the exact file/line on GitHub

### AI Chat
- **Ask about this** — hover any chapter narrative or diff hunk and click to ask Claude to expand on it
- **Open-ended chat** — slide-out panel for follow-up questions with full PR context
- **Streaming responses** — answers stream in real-time via SSE

### GitHub Integration
- **Approve / Request changes** — submit reviews directly from the app (gated on 100% chapter completion)
- **Line comments** — click any diff line to post a comment on the GitHub PR
- **Deep-links** — every hunk links back to its GitHub file location

### Export & History
- **Export as Markdown** — download the full narrative review as a `.md` file to share with teammates
- **Review history** — landing page shows your recent analyses for quick re-access
- **localStorage caching** — revisiting a previously analyzed PR loads instantly from cache

### Model Selection
- **Claude Haiku** — fast and cheap (~$0.01 per review)
- **Claude Sonnet** — balanced quality and speed (~$0.10)
- **Claude Opus** — deepest analysis (~$0.50)
- **Cost transparency** — token counts and dollar cost shown after analysis
- **Prompt caching** — system prompt is cached to reduce repeated costs

### UI
- **Fancy mode** — futuristic UI with aurora backgrounds, glassmorphism, glow effects, animated transitions
- **Clean mode** — minimal zinc-on-black UI for distraction-free reviewing
- **Global toggle** — switch between modes with the floating button (bottom-right), persists across sessions
- **Celebration** — completion overlay when all chapters are reviewed

---

## Setup

### Prerequisites

- **Node.js** 18+
- **GitHub CLI** (`gh`) — authenticated with `gh auth login`
- **Anthropic API key** — from [console.anthropic.com](https://console.anthropic.com)

### Install

```bash
cd ~/Developer
git clone <repo-url> narrative-review
cd narrative-review
npm install
```

### Configure

Create `.env.local` in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

### Reviewing a GitHub PR

1. Copy the PR URL (e.g. `https://github.com/owner/repo/pull/123`)
2. Paste it on the landing page
3. Choose a model (Sonnet is a good default)
4. Click **Analyze PR**
5. Read through chapters in order, marking each as reviewed
6. When done, approve or request changes from the sidebar

### Reviewing Local Branches

1. Switch to the **Local Branch** tab
2. Enter your repo path (e.g. `/Users/you/Developer/project`)
3. Branches are auto-discovered — pick base and head
4. Click **Analyze Branch**
5. Review the narrative as with any PR

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` | Next chapter |
| `k` | Previous chapter |
| `Space` | Toggle chapter as reviewed |
| `n` | Jump to next unreviewed chapter |
| `?` | Show shortcut help |

### Walkthrough Mode

Click **Walkthrough mode** in the sidebar for a full-screen, one-chapter-at-a-time presentation. Navigate with arrow keys or on-screen buttons. Diffs auto-reveal with staggered animations.

### Asking Questions

- Hover over a chapter's narrative text → click **Ask about this**
- Hover over a diff hunk header → click the chat icon
- Or open the chat panel from the sidebar for open-ended questions

The chat has full context of the PR analysis and can explain any part in detail.

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/         # PR analysis endpoint
│   │   ├── analyze-local/   # Local branch analysis endpoint
│   │   ├── approve/         # GitHub review submission
│   │   ├── chat/            # Streaming AI chat
│   │   ├── comment/         # GitHub line comments
│   │   └── local-branches/  # Branch discovery
│   ├── review/              # Review page
│   ├── layout.tsx           # Root layout + providers
│   ├── page.tsx             # Landing page
│   └── globals.css          # Animations + fancy mode styles
├── components/
│   ├── ReviewContainer.tsx  # Main review layout orchestrator
│   ├── ChapterCard.tsx      # Individual chapter renderer
│   ├── DiffView.tsx         # Diff rendering (3 modes)
│   ├── ChapterTimeline.tsx  # Sidebar navigation
│   ├── ProgressTracker.tsx  # Top progress bar
│   ├── ChatPanel.tsx        # AI chat drawer
│   ├── WalkthroughMode.tsx  # Cinematic walkthrough
│   └── FancyModeToggle.tsx  # UI mode toggle
├── hooks/
│   ├── useReviewState.ts    # Review progress persistence
│   └── useFancyMode.tsx     # UI mode context
└── lib/
    ├── types.ts             # Shared type definitions
    ├── github.ts            # GitHub CLI wrapper
    ├── local-git.ts         # Local git operations
    ├── diff-parser.ts       # Unified diff parser
    ├── analyzer.ts          # Claude narrative analysis
    └── coverage-verifier.ts # Hunk coverage checker
```

### How Analysis Works

1. **Fetch** — Raw diff and metadata from GitHub (`gh pr diff/view`) or local git (`git diff`)
2. **Parse** — Unified diff is parsed into structured files and hunks
3. **Analyze** — Full diff + PR description sent to Claude with a system prompt that instructs causal ordering
4. **Verify** — Deterministic coverage check ensures every hunk is referenced by at least one chapter
5. **Backfill** — Any uncovered hunks are grouped into an "Uncategorized Changes" chapter with warnings
6. **Cache** — Results stored in `localStorage` for instant reload

---

## Tech Stack

- **Next.js 16** (App Router) — framework
- **React 19** — UI
- **Tailwind CSS 4** — styling
- **Anthropic SDK** — Claude API
- **Lucide React** — icons
- **GitHub CLI** (`gh`) — GitHub integration via child processes
- **TypeScript** — throughout

---

## License

MIT
