# Project Structure

## Monorepo Layout

```
stageboard/
├── backend/                        # Spring Boot / Kotlin REST API (Maven)
│   ├── src/
│   │   ├── main/kotlin/ch/welld/soa/automation/
│   │   │   ├── auth/               # AuthController, AuthService
│   │   │   ├── workshop/           # WorkshopController, WorkshopService, WorkshopRepository
│   │   │   ├── phase/
│   │   │   ├── step/
│   │   │   ├── lock/
│   │   │   ├── version/
│   │   │   ├── import/
│   │   │   └── common/             # Result<T>, DomainError, extensions
│   │   └── main/resources/
│   │       └── db/changelog/       # Liquibase SQL changelogs
│   ├── target/generated-sources/jooq/  # jOOQ Kotlin records (generated; not committed)
│   └── pom.xml
├── frontend/                       # Single React + Vite app
│   ├── src/
│   │   ├── routes/                 # TanStack Router file-based routes
│   │   │   ├── __root.tsx          # Root layout — QueryClientProvider, router devtools
│   │   │   ├── backoffice/
│   │   │   │   ├── _auth.tsx       # Auth guard layout route (beforeLoad → redirect to login)
│   │   │   │   ├── login.tsx
│   │   │   │   ├── workshops/
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   └── $id/
│   │   │   │   │       ├── edit.tsx
│   │   │   │   │       └── versions.tsx
│   │   │   │   └── import.tsx
│   │   │   └── frontoffice/
│   │   │       ├── index.tsx       # Workshop picker / delivery landing
│   │   │       └── $sessionCode/
│   │   │           ├── trainer.tsx
│   │   │           └── participant.tsx
│   │   ├── components/             # Shared UI components (used by both trees)
│   │   │   ├── backoffice/         # Backoffice-only components
│   │   │   └── frontoffice/        # Frontoffice-only components
│   │   ├── hooks/                  # Reusable stateful logic
│   │   ├── services/               # TanStack Query hooks + typed apiClient
│   │   ├── data/                   # Domain types: Workshop, Phase, Step, etc.
│   │   ├── contexts/               # WorkflowContext, NotesContext (frontoffice)
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── pnpm-workspace.yaml
├── package.json                    # Workspace root
└── .mise.toml                      # Toolchain: node, pnpm, java (temurin-21), maven
                                    # Tasks: mise run dev | build | lint | typecheck | preview
                                    #        mise run backend:run | build | test | codegen | verify
```

---

## Frontend Conventions

### Route Tree Isolation

- `/backoffice/*` — auth-gated via `_auth.tsx` layout route (`beforeLoad` hook checks session); all content-authoring UI lives here.
- `/frontoffice/*` — public; delivery views (Trainer, Participant) live here.
- Both trees share `QueryClientProvider` (root), domain types (`src/data/`), and the `apiClient` (`src/services/`).

### Organization Philosophy

Feature-thin, concern-layered within each route tree.

### `src/data/`
- Domain types: `Workshop`, `Phase`, `Step`, `WorkshopVersion`, `StepType` and all related interfaces.
- Shared between backoffice and frontoffice routes — single source of truth.
- No business logic; types and static data only.

### `src/services/`
- `apiClient.ts` — typed `fetch` wrapper; injects `credentials: "include"`; never throws; returns `ApiResult<T>`.
- Domain service files: `workshopService.ts`, `phaseService.ts`, `stepService.ts`, `lockService.ts`, `versionService.ts`, `importService.ts`.
- Each service file exports TanStack Query hooks (`useWorkshops`, `useCreateWorkshop`, etc.).

### `src/components/`
- `PascalCase` filenames; one component per file.
- Props interface defined inline above the component.
- Named exports only (no default exports except page-level routes and `App.tsx`).
- Sub-directories `backoffice/` and `frontoffice/` for route-scoped components; top-level for shared ones.

### `src/hooks/`
- Prefix `use`; reusable across components.
- Examples: `useAutoSave.ts`, `useWorkflow.ts`, `usePhaseTimers.ts`, `useKeyboardShortcuts.ts`.

### `src/contexts/`
- Suffix `Context`; provider components co-located.
- `WorkflowContext.tsx` and `NotesContext.tsx` are frontoffice-specific.

---

## Backend Conventions

Domain-driven package structure; one package per bounded context.

### Package Layout

```
ch.welld.soa.automation/
├── auth/
│   ├── AuthController.kt
│   ├── AuthService.kt
│   └── UserRepository.kt
├── workshop/
│   ├── WorkshopController.kt
│   ├── WorkshopService.kt
│   └── WorkshopRepository.kt
├── phase/ ...
├── step/
│   ├── StepController.kt
│   ├── StepService.kt
│   ├── StepRepository.kt
│   └── StepContentValidator.kt
├── lock/ ...
├── version/ ...
├── import/
│   ├── ImportController.kt
│   ├── MarkdownImportService.kt
│   └── AssetService.kt
└── common/
    └── model/                      # Result<T>, DomainError — shared infrastructure; extend carefully
```

### Naming Conventions

- Controller: `{Domain}Controller.kt`
- Service: `{Domain}Service.kt`
- Repository: `{Domain}Repository.kt`
- DTOs: `{Domain}Request.kt` / `{Domain}Response.kt`
- Domain models: `{Domain}.kt` (pure `data class`, no Spring annotations)

### Liquibase Changelogs

```
backend/src/main/resources/db/changelog/
├── db.changelog-master.xml         # Master changelog (includes all SQL files)
└── changes/
    ├── 001-initial-schema.sql
    ├── 002-add-indexes.sql
    └── ...
```

Each SQL changeset file format:
```sql
-- liquibase formatted sql
-- changeset stageboard:<NNN>
CREATE TABLE ...;
```

---

## Naming Conventions (shared)

| Artifact | Convention | Example |
|----------|------------|---------|
| React component files | PascalCase | `WorkshopEditorPage.tsx` |
| Hook files | camelCase with `use` prefix | `useAutoSave.ts` |
| Service files | camelCase | `workshopService.ts` |
| Kotlin classes | PascalCase | `WorkshopService.kt` |
| Kotlin functions | camelCase | `createWorkshop()` |
| DB tables | snake_case | `workshop_versions` |
| API paths | kebab-case | `/api/workshops/:id/phases/order` |

---
_Document patterns and structure, not exhaustive file trees. New files following patterns should not require updates._
