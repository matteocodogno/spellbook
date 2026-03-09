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
- Format: <type>(<scope>): <description>
- Types: feat | fix | docs | style | refactor | test | chore | perf | ci
- scope = task ID or module name, e.g. feat(task-7): or fix(auth):
- Description: imperative, lowercase, no period, max 72 chars
- Breaking changes: add BREAKING CHANGE: in footer
- Examples:
  feat(stripe): add webhook signature validation
  fix(auth): handle 401 on token refresh
  test(pdf): add export edge case coverage
  chore(deps): upgrade stripe-node to v14
- NEVER use generic messages like "fix bug" or "update code"

## What NOT to do
- Never install a CSS-in-JS library (styled-components, emotion, etc.) — Tailwind only
- Never add a state management library unless explicitly requested
- Never add a router — this is a single-page app with no routes
- Never modify `index.html` without checking with the human first
- Never autonomously modify this CLAUDE.md — propose changes to the human instead

# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in English. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)
