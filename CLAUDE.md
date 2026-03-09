# CLAUDE.md — Spellbook

## Project overview
Interactive course companion for AI4Dev — a React + TypeScript single-page app built with Vite, Tailwind v4, and pnpm. Deployed as a static site.

## Stack
- Runtime: Node 22 (managed by mise)
- Package manager: pnpm (managed by mise)
- Framework: React 18 + TypeScript
- Bundler: Vite
- Styling: Tailwind CSS v4 (Vite plugin, no config file)
- Fonts: JetBrains Mono (monospace UI)

## Environment
- All runtimes and tools are managed via mise
- Never invoke node, pnpm, npx directly — always prefix with `mise exec --` or run inside an active mise shell
- If a tool is missing: add it to `.mise.toml` and run `mise install` before proceeding
- Never assume a version — always check `.mise.toml` first

## Commands
- `mise run dev` — start dev server at http://localhost:5173
- `mise run build` — production build to `dist/`
- `mise run preview` — preview production build locally
- `mise run typecheck` — run `tsc --noEmit`
- `mise run lint` — run ESLint

## Code style
- TypeScript strict mode is on — no `any`, no `@ts-ignore` without a comment explaining why
- Functional components only — no class components
- Props interfaces defined inline above the component they belong to
- No default exports except for page-level components and `App.tsx`
- Tailwind utility classes only — no inline `style={{}}` unless strictly necessary for dynamic values (e.g. computed colours)
- Colours come from `@theme` in `index.css` — never hardcode hex values in components

## Component conventions
- One component per file
- Files named in PascalCase: `PhaseCard.tsx`, `ExercisePanel.tsx`
- Co-locate types in the same file unless shared across 3+ components
- Data (phase definitions, step content) lives in `src/data/` — never inline in components
- Phase colour palette defined once in `src/data/palette.ts`

## Pre-commit checklist (run in order, block commit if any fail)
1. `mise run typecheck` — zero type errors
2. `mise run lint` — zero lint errors
3. `mise run build` — production build must succeed

## Commit message rules (Conventional Commits)
- Format: `<type>(<scope>): <description>`
- Types: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`
- scope = component or module name, e.g. `feat(phase-card):` or `fix(exercise-panel):`
- Description: imperative, lowercase, no period, max 72 chars
- Examples:
    - `feat(spellbook): add exercise reveal toggle`
    - `fix(code-block): fallback copy for sandboxed iframes`
    - `chore(deps): upgrade tailwindcss to v4.1`
- Never use generic messages like "fix bug" or "update styles"

## What NOT to do
- Never install a CSS-in-JS library (styled-components, emotion, etc.) — Tailwind only
- Never add a state management library unless explicitly requested
- Never add a router — this is a single-page app with no routes
- Never modify `index.html` without checking with the human first
- Never autonomously modify this CLAUDE.md — propose changes to the human instead