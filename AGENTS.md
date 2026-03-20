# AGENTS.md

Guidelines for AI agents working on this codebase.

## Project Overview

Narrative Review is an AI-powered code review tool that reorders PR diffs into a causal narrative. It ships as both a **GitHub Action** (consumed by other repos) and a **local Next.js web app**.

## Repository Layout

```
action/          → GitHub Action entry point and helpers (TypeScript, bundled with ncc)
static/          → Standalone HTML review page (React, bundled with Vite into a single file)
src/app/         → Next.js App Router pages and API routes (local web app)
src/components/  → Shared React components (used by both Next.js and static builds)
src/lib/         → Core logic: diff parsing, Claude analysis, coverage verification, types
src/hooks/       → React hooks (review state, theme, fancy mode)
dist-action/     → Committed build output — the bundled GitHub Action
dist-static/     → Committed build output — the self-contained HTML template
```

## Build System

There are three build pipelines. Changes to source files require rebuilding the corresponding dist:

- `npm run build:static` — Vite bundles `static/` + shared `src/` into `dist-static/index.html`
- `npm run build:action` — ncc bundles `action/index.ts` into `dist-action/index.js`, then copies the static template
- `npm run build:all` — runs both sequentially

**You do not need to run the build manually.** A CI workflow (`.github/workflows/build.yml`) automatically rebuilds and commits `dist-action/` and `dist-static/` on every PR if they are stale.

## Key Conventions

- **TypeScript throughout** — strict mode enabled, path alias `@/` maps to `src/`
- **Tailwind CSS 4** — utility-first styling, configured via PostCSS (Next.js) and Vite plugin (static)
- **No test framework** — there are no tests currently; coverage verification is deterministic logic in `src/lib/coverage-verifier.ts`
- **`src/lib/types.ts`** is the single source of truth for shared types across all three build targets
- **Components in `src/components/`** must work in both Next.js and static (Vite) contexts — avoid Next.js-specific imports (like `next/link`) in shared components; the static build shims them via Vite aliases in `static/vite.config.mts`

## GitHub Action Architecture

- Entry point: `action/index.ts`
- The action reads inputs via `@actions/core`, fetches PR data via `@actions/github` (Octokit), runs analysis through shared `src/lib/` modules, then deploys the review page
- `action/deploy.ts` pushes to the `gh-pages` branch via the GitHub API
- `action/github-api.ts` handles PR metadata, diff fetching, and PR description updates
- `action/check-run.ts` manages GitHub Check Runs
- The bundled output at `dist-action/index.js` is what GitHub actually executes — defined in `action.yml` under `runs.main`

## Common Tasks

**Adding a new component**: Create it in `src/components/`. If it uses Next.js-specific APIs, it can only be used in the Next.js app. If it needs to work in the static build too, avoid Next.js imports or add a shim in `static/vite.config.mts`.

**Modifying the Claude prompt**: The system prompt lives in `src/lib/analyzer.ts`. Changes here affect both the local web app and the GitHub Action.

**Changing action inputs/outputs**: Update both `action.yml` (the Action manifest) and `action/index.ts` (where inputs are read).

**Adding dependencies**: Use `npm install`. Runtime deps go in `dependencies`; build-only or action-only deps go in `devDependencies`.

## Keeping Docs Up to Date

After completing any change to this project, review and update the following files so they stay accurate:

- **`AGENTS.md`** (this file) — update the repository layout, conventions, architecture, or common tasks sections if the change introduced new directories, files, patterns, build steps, or conventions
- **`README.md`** — update the Architecture tree, feature list, tech stack, action inputs table, or development section if the change affects any of those

Do not skip this step. Stale docs cause compounding confusion for both humans and agents.
