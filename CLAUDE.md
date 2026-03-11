# CLAUDE.md — Stageboard

## Project overview
Stageboard is a real-time, multi-user workshop delivery platform for AI4Dev — a monorepo with a Spring Boot/Kotlin REST API (`backend/`) and a React + Vite SPA (`frontend/`). The frontend has two route trees: `/backoffice` (content authoring) and `/frontoffice` (live delivery).

## Monorepo structure
```
stageboard/
├── backend/        # Spring Boot 4 / Kotlin 2.3 / Maven
├── frontend/       # React 19 + Vite 7 + TanStack Router + Tailwind v4
├── .mise.toml      # Toolchain: node 22, pnpm, java temurin-21, maven
├── pnpm-workspace.yaml
└── .kiro/          # Steering + specs
```

## Environment
- All runtimes managed via mise — never invoke `node`, `pnpm`, `java`, or `mvn` directly
- Always use `mise run <task>` or work inside an active mise shell
- If a tool is missing: add it to `.mise.toml` and run `mise install` first
- Never assume a version — always check `.mise.toml` first

## Commands

### Frontend (`frontend/`)
- `mise run dev` — Vite dev server → http://localhost:5173
- `mise run build` — production build to `frontend/dist/`
- `mise run typecheck` — `tsc --noEmit`
- `mise run lint` — ESLint
- `mise run preview` — preview production build

### Backend (`backend/`)
- `mise run backend:run` — Spring Boot dev server → http://localhost:8080
- `mise run backend:build` — compile + package JAR (tests skipped)
- `mise run backend:test` — run all tests
- `mise run backend:codegen` — regenerate jOOQ Kotlin records from Liquibase changelogs
- `mise run backend:verify` — full verify lifecycle (compile + test + package)

## Frontend code style
- TypeScript strict mode — no `any`, no `@ts-ignore` without an explanatory comment
- React 19 functional components only — no class components
- Props interfaces defined inline above the component they belong to
- Named exports only — no default exports except page-level route components
- Tailwind utility classes only — no inline `style={{}}` unless required for dynamic computed values
- Colours defined in `@theme` block in `index.css` — never hardcode hex values
- Phase colour palette defined once in `src/data/palette.ts`

## Frontend component conventions
- One component per file; PascalCase filenames: `WorkshopEditorPage.tsx`
- Co-locate types in the same file unless shared across 3+ components
- Domain types and static data in `src/data/` — never inline in components
- Route-scoped components in `src/components/backoffice/` or `src/components/frontoffice/`; shared ones at `src/components/`

## Backend code style
- Kotlin 2.3, JVM 21 — functional idioms; no Java source files
- Spring MVC (blocking) only — no WebFlux, Reactor, or Coroutines in the API layer
- All fallible operations return `Result<T>` from `io.stageboard.spellbook.common.model` — never throw as control flow
- Use `Result.catching { }` at infrastructure boundaries; chain with `map`, `flatMap`, `fold`
- Domain and DTO types are `data class` with `val` fields — no `var` in domain or service layer
- No JPA/Hibernate — jOOQ only for all database access
- `DomainError` subtypes: `DatabaseError` | `ValidationError` | `NotFoundError` | `UnexpectedError` | `StateError`
- **Spring Modulith modules**: `auth` | `design` | `edition` | `import` | `common` (open)
  - Cross-module access only via `{Module}Operations` interface in the module root package
  - All implementation classes go in `internal/` — never imported by other modules
  - `design` sub-contexts (`workshop/`, `phase/`, `step/`, `lock/`, `version/`) communicate freely inside `design/internal/`

## Pre-commit checklist (run in order, block commit if any fail)
1. `mise run typecheck` — zero frontend type errors
2. `mise run lint` — zero frontend lint errors
3. `mise run build` — frontend production build must succeed
4. `mise run backend:verify` — backend compile + test + package must pass

## Commit message rules (Conventional Commits)
- Format: `<type>(<scope>): <description>`
- Types: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore` | `perf` | `ci`
- Scope = task ID or module name, e.g. `feat(design):` or `fix(auth):`
- Description: imperative, lowercase, no period, max 72 chars
- Breaking changes: add `BREAKING CHANGE:` in footer
- Examples:
  ```
  feat(design): add pessimistic lock on edit
  fix(auth): handle expired JWT cookie on refresh
  test(import): add markdown parse edge cases
  chore(deps): upgrade spring-boot to 4.0.1
  ```
- NEVER use generic messages like "fix bug" or "update code"

## What NOT to do
- Never install a CSS-in-JS library (styled-components, emotion, etc.) — Tailwind only
- Never add a state management library (Redux, Zustand, etc.) — TanStack Query covers server state; React context for minimal local state
- Never use JPA/Hibernate — jOOQ only
- Never throw exceptions as primary control flow in the backend — use `Result<T>`
- Never invoke `node`, `pnpm`, `java`, or `mvn` directly — always use `mise run`

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
- Default files: `product.md`, `tech.md`, `structure.md`, `backend.md`
- Custom files are supported (managed via `/kiro:steering-custom`)
