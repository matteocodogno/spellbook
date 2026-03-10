# Technology Stack

## Architecture

**Monorepo** with two workspaces: `backend/` (Spring Boot / Kotlin REST API) and `frontend/` (React + Vite SPA).

The frontend is a **single Vite application** with two route trees managed by TanStack Router:
- `/backoffice/*` — auth-gated content authoring (create/edit workshops, phases, steps)
- `/frontoffice/*` — public workshop delivery (Trainer and Participant views)

Both route trees share the same build, `QueryClient`, domain types (`src/data/`), and API client (`src/services/apiClient.ts`).

---

## Frontend

### Core Technologies

- **Language**: TypeScript 5.9 (strict mode)
- **Framework**: React 19 (functional components only)
- **Bundler**: Vite 7 with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config.js`
- **Routing**: TanStack Router v1 — file-based routes in `src/routes/`; type-safe params
- **Server state**: TanStack Query v5 — `QueryClientProvider` at `__root.tsx`
- **Runtime**: Node 22, managed by mise

### Key Libraries

- `@dnd-kit/core` v6 + `@dnd-kit/sortable` v8 — phase/step drag-and-drop (backoffice only)
- `@uiw/react-codemirror` v4 + `@codemirror/lang-markdown` — Markdown editor (backoffice only)
- `react-markdown` v9 + `remark-gfm` v4 + `rehype-highlight` v7 — Markdown rendering (both trees)
- No CSS-in-JS, no Axios, no Redux/Zustand

### Development Standards

#### Type Safety
- TypeScript strict mode: no `any`, no `@ts-ignore` without an explanatory comment
- Props interfaces defined inline above the component they belong to
- Shared types in `src/data/`

#### Code Quality
- ESLint 9 with `typescript-eslint` and `eslint-plugin-react-hooks`
- Zero lint errors required before commit

#### Styling
- Tailwind utility classes only
- Colours defined in `@theme` block in `index.css` — never hardcode hex values
- Phase palette defined once in `src/data/palette.ts`

### Auth
- httpOnly JWT cookie issued by the backend
- All fetch calls use `credentials: "include"`
- `_auth.tsx` TanStack Router layout route guards `/backoffice/*` via `beforeLoad`; unauthenticated → redirect to `/backoffice/login`
- No OAuth library on the client; the backend handles the full OAuth flow

---

## Backend

See `backend.md` for the complete backend stack and coding principles.

**Summary**:
- Spring Boot 4.0.x — Spring MVC (blocking)
- Kotlin 2.3.x (JVM 21); build: Maven + `kotlin-maven-plugin` + `spring-boot-maven-plugin`
- jOOQ 3.20.x (`jooq` + `jooq-kotlin`) — type-safe SQL DSL; no JPA
- jOOQ codegen: `jooq-codegen-maven` plugin + `jooq-meta-extensions-liquibase` → Kotlin records generated at `generate-sources` from Liquibase changelogs (no live DB required)
- PostgreSQL 16
- Liquibase 5.x — SQL-format changelogs (`liquibase-spring-boot-starter`)
- Spring Security 7 — OAuth2 Client + JWT cookie
- AWS S3 SDK v2 2.42.x — MinIO asset store

---

## Development Environment

### Required Tools

All runtimes and build tools are managed via mise (declared in `.mise.toml` at the repo root).
Never invoke `node`, `pnpm`, `java`, or `mvn` directly — always use `mise run <task>` or work inside an active mise shell.

```bash
# Frontend
mise run dev          # Vite dev server → http://localhost:5173
mise run build        # Production build → frontend/dist/
mise run typecheck    # tsc --noEmit
mise run lint         # ESLint
mise run preview      # Preview production build locally

# Backend
mise run backend:run      # Spring Boot dev server → http://localhost:8080
mise run backend:build    # Compile + package JAR (tests skipped)
mise run backend:test     # Run all tests
mise run backend:codegen  # Regenerate jOOQ Kotlin records from Liquibase changelogs
mise run backend:verify   # Full verify lifecycle (compile + test + package)
```

### Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `VITE_API_BASE_URL` | frontend | Backend API base URL (e.g. `http://localhost:8080`) |
| `MINIO_ENDPOINT` | backend | MinIO S3-compatible endpoint |
| `MINIO_BUCKET` | backend | Asset bucket name |
| `AWS_ACCESS_KEY_ID` | backend | MinIO access key |
| `AWS_SECRET_ACCESS_KEY` | backend | MinIO secret key |
| `OAUTH_CALLBACK_BASE_URL` | backend | Base URL for OAuth redirect callbacks |
| `FRONTEND_ORIGIN` | backend | CORS allowed origin for the unified frontend (`/backoffice` + `/frontoffice`) |
| `JWT_SECRET` | backend | Secret for JWT signing |

---

## Key Technical Decisions

- **Single frontend app**: `/backoffice` and `/frontoffice` route trees share one build, one `QueryClient`, and one domain type definition — eliminates duplication and synchronisation issues between two separate apps.
- **TanStack Router file-based routes**: type-safe route params and search params; `_auth` layout route convention for auth guards without a custom HOC.
- **No CSS-in-JS**: Tailwind v4 Vite plugin; consistent with the monospace developer aesthetic.
- **No Redux/Zustand**: TanStack Query covers all server state; React context for minimal local state (`WorkflowContext`, `NotesContext`).
- **Backend `Result<T>` contract**: all fallible operations return `Result<T>`; never throw as control flow (see `backend.md`).

---
_Document standards and patterns, not every dependency_
