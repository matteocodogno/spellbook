# Stageboard

Real-time, multi-user workshop delivery platform for AI4Dev. Monorepo with a Spring Boot/Kotlin REST API and a React/Vite SPA.

## What it does

**Backoffice** (auth-gated) — content authoring: create and edit workshops, phases, and steps; publish versioned snapshots; import Markdown files; manage pessimistic edit locks.

**Frontoffice** (public) — live delivery: trainer navigates phases/steps and broadcasts position to participants in real time; participants follow, mark steps complete, and take notes.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend language | TypeScript 5.9 (strict) |
| Frontend framework | React 19 + Vite 7 |
| Routing | TanStack Router v1 (file-based) |
| Server state | TanStack Query v5 |
| Styling | Tailwind CSS v4 (Vite plugin) |
| Backend language | Kotlin 2.3.x (JVM 21) |
| Backend framework | Spring Boot 4.0.x — Spring MVC (blocking) |
| Database access | jOOQ 3.20.x (type-safe SQL DSL, no JPA) |
| Database | PostgreSQL 16 |
| Schema migrations | Liquibase 5.x (SQL-format changelogs) |
| Auth | Spring Security 7 — OAuth2 + httpOnly JWT cookie |
| Asset store | MinIO via AWS S3 SDK v2 |
| Build tool | Maven (backend) · pnpm (frontend) |
| Runtime manager | mise |

## Project structure

```
stageboard/
├── backend/          # Spring Boot / Kotlin REST API (Maven)
├── frontend/         # React + Vite SPA (pnpm)
├── .kiro/            # Spec-driven development (steering, specs)
├── .mise.toml        # Toolchain: node, pnpm, java, maven
└── pnpm-workspace.yaml
```

## Getting started

### Prerequisites

Install [mise](https://mise.jdx.dev) and let it provision all runtimes:

```bash
mise install
```

### Environment variables

Copy and fill in the required values before starting the backend:

| Variable | Description |
|----------|-------------|
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | DB username |
| `SPRING_DATASOURCE_PASSWORD` | DB password |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) |
| `FRONTEND_ORIGIN` | CORS allowed origin (e.g. `http://localhost:5173`) |
| `OAUTH_CALLBACK_BASE_URL` | Base URL for OAuth redirect callbacks |
| `MINIO_ENDPOINT` | MinIO S3-compatible endpoint |
| `MINIO_BUCKET` | Asset bucket name |
| `AWS_ACCESS_KEY_ID` | MinIO access key |
| `AWS_SECRET_ACCESS_KEY` | MinIO secret key |
| `VITE_API_BASE_URL` | Backend API base URL for the frontend (e.g. `http://localhost:8080`) |

### Run in development

```bash
# Backend — Spring Boot on :8080
mise run backend:run

# Frontend — Vite dev server on :5173
mise run dev
```

## Available commands

```bash
# Frontend
mise run dev          # Vite dev server → http://localhost:5173
mise run build        # Production build → frontend/dist/
mise run typecheck    # tsc --noEmit
mise run lint         # ESLint
mise run preview      # Preview production build

# Backend
mise run backend:run      # Spring Boot dev server → http://localhost:8080
mise run backend:build    # Compile + package JAR (tests skipped)
mise run backend:test     # Run all tests
mise run backend:codegen  # Regenerate jOOQ Kotlin records from Liquibase changelogs
mise run backend:verify   # Full verify lifecycle (compile + test + package)
```

## Architecture notes

- **Single frontend app**: `/backoffice` and `/frontoffice` route trees share one build, one `QueryClient`, and one domain type set.
- **jOOQ codegen**: Kotlin records are generated automatically at `mvn generate-sources` from Liquibase changelogs — no live database needed at build time.
- **`Result<T>` error contract**: all fallible backend operations return `Result<T>`; exceptions never propagate past the service layer.
- **No `@ControllerAdvice`**: controllers call `result.toResponseEntity()` directly; each service catches exceptions via `Result.catching { }`.
