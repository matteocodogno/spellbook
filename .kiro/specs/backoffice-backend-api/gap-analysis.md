# Gap Analysis — backoffice-backend-api

**Date**: 2026-03-10
**Status**: Complete
**Approach**: Option B (New Components) — greenfield backend; all domain logic must be created from scratch

---

## Analysis Summary

- **Scope**: 11 functional requirements, 5 NFR categories (perf, security, scalability, reliability, constraints).
  Roughly 35–40 Kotlin files to create across 8 domain packages.
- **Existing foundation**: `Result<T>` + `DomainError` shared infrastructure is fully implemented and ready; `pom.xml`
  with all dependencies is declared; the initial Liquibase SQL schema covers all required tables; package stubs exist
  for all 8 domains.
- **Primary challenge**: jOOQ record generation must run (`mvn generate-sources`) before any repository code can
  reference generated types — this is a prerequisite for all implementation tasks.
- **Complex areas**: Step content validation (type-discriminated JSONB), cross-phase step move (atomic transaction),
  import session state (in-memory TTL store), OAuth2 + JWT cookie integration with Spring Security 7.
- **All 3 open architecture decisions (MVC/jOOQ/MinIO) are resolved** in requirements; no further architectural research
  needed.

---

## 1. Current State Investigation

### 1.1 What Exists

| Asset             | Location                                                                           | State                                                                                                                                                                                                                                  |
|-------------------|------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Result<T>`       | `common/model/Result.kt`                                                           | ✅ Complete — `map`, `flatMap`, `fold`, `catching`, `recover`, `recoverWith`, `getOrNull`, companion `success`/`failure`                                                                                                                |
| `DomainError`     | `common/model/DomainError.kt`                                                      | ✅ Complete — `DatabaseError`, `ValidationError`, `NotFoundError`, `UnexpectedError`, `StateError` + `toException()`                                                                                                                    |
| Application entry | `StageboardApplication.kt`                                                         | ✅ Minimal, sufficient                                                                                                                                                                                                                  |
| `pom.xml`         | `backend/pom.xml`                                                                  | ✅ All dependencies declared: Spring Boot 4.0.1, Kotlin 2.3.10, jOOQ 3.20.8, jooq-kotlin, jooq-meta-extensions-liquibase, Liquibase 5.0.2, Spring Security 7, AWS SDK v2 2.42.8, commonmark-java 0.27.1, Apache Tika 3.2.3, JJWT 0.12.6 |
| `application.yml` | `src/main/resources/`                                                              | ✅ All env vars mapped: datasource, Liquibase, OAuth2 providers, MinIO, JWT, CORS                                                                                                                                                       |
| Liquibase master  | `db/changelog/db.changelog-master.xml`                                             | ✅ Configured to `includeAll` from `changes/`                                                                                                                                                                                           |
| Initial schema    | `db/changelog/changes/001-initial-schema.sql`                                      | ✅ All tables: `teams`, `users`, `workshops`, `phases`, `steps`, `workshop_versions`, `workshop_locks`                                                                                                                                  |
| Package stubs     | `auth/`, `workshop/`, `phase/`, `step/`, `lock/`, `version/`, `import/`, `common/` | ✅ Directories exist, no `.kt` files yet                                                                                                                                                                                                |
| Test scaffolding  | `StageboardApplicationTests.kt`                                                    | ✅ `@SpringBootTest` context load test                                                                                                                                                                                                  |

### 1.2 What is Missing

**Shared infrastructure (cross-cutting)**

- `Result.toResponseEntity()` extension — required by Req 10 AC 7; no controller can be written without it
- `@ControllerAdvice` global exception handler — required by Req 10 AC 6
- Spring Security configuration (JWT filter, CORS, endpoint whitelist)
- JWT cookie issuance / validation utilities

**Domain packages** — all empty:

- `auth/`: `AuthController`, `AuthService`, `UserRepository`, DTOs
- `workshop/`: `WorkshopController`, `WorkshopService`, `WorkshopRepository`, DTOs
- `phase/`: `PhaseController`, `PhaseService`, `PhaseRepository`, DTOs
- `step/`: `StepController`, `StepService`, `StepRepository`, `StepContentValidator`, DTOs
- `lock/`: `LockController`, `LockService`, `LockRepository`, DTOs
- `version/`: `VersionController`, `VersionService`, `VersionRepository`, DTOs
- `import/`: `ImportController`, `MarkdownImportService`, `AssetService`, import session store
- `common/`: `Result.toResponseEntity()`, `GlobalExceptionHandler`, `SecurityConfig`, `JwtUtils`

**jOOQ generated records**

- `target/generated-sources/jooq/` — not yet generated; `mvn generate-sources` must run first
- Records are required by all Repository implementations

---

## 2. Requirements Feasibility Analysis

### 2.1 Requirement-to-Asset Map

| Req | Description             | Existing                                                                     | Missing                                                                                                                       | Tag                       |
|-----|-------------------------|------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|---------------------------|
| 1   | Auth + JWT cookie       | `pom.xml` (Spring Security 7, OAuth2, JJWT); `application.yml` OAuth2 config | `AuthController`, `AuthService`, `UserRepository`, `SecurityConfig`, `JwtUtils`, `JwtAuthFilter`                              | Missing                   |
| 2   | Team isolation          | `DomainError.NotFoundError` / `ValidationError` in model                     | Team-scope check in every service method; no aspect/guard yet                                                                 | Missing                   |
| 3   | Workshop CRUD           | `workshops` table schema                                                     | `WorkshopController`, `WorkshopService`, `WorkshopRepository`, request/response DTOs                                          | Missing                   |
| 4   | Phase management        | `phases` table with `UNIQUE(workshop_id, position)`                          | `PhaseController`, `PhaseService`, `PhaseRepository`; positional compaction logic                                             | Missing                   |
| 5   | Step management + move  | `steps` table with `UNIQUE(phase_id, position)`; JSONB `content` column      | `StepController`, `StepService`, `StepRepository`; atomic cross-phase move in transaction                                     | Missing                   |
| 6   | Step content validation | `DomainError.ValidationError`                                                | `StepContentValidator` — type-discriminated validator for JSONB content                                                       | Missing                   |
| 7   | Versioning + publish    | `workshop_versions` table with JSONB `snapshot`                              | `VersionController`, `VersionService`, `VersionRepository`; version label computation; restore logic                          | Missing                   |
| 8   | Pessimistic locking     | `workshop_locks` with `expires_at TIMESTAMPTZ`                               | `LockController`, `LockService`, `LockRepository`; TTL lazy-check logic                                                       | Missing                   |
| 9   | Markdown import         | `pom.xml` (commonmark-java, Tika, AWS SDK)                                   | `ImportController`, `MarkdownImportService` (H2→phase, H3→step parser), `AssetService` (S3), in-memory session store with TTL | Missing                   |
| 10  | Error handling contract | `Result<T>`, `DomainError` with all subtypes                                 | `GlobalExceptionHandler` (`@ControllerAdvice`), `Result.toResponseEntity()` extension                                         | Missing                   |
| 11  | Persistence + integrity | Full schema with FK constraints; Liquibase auto-apply                        | All repositories; transactional wrappers for multi-step ops; `mvn generate-sources` prerequisite                              | Missing (codegen blocked) |

### 2.2 Complexity Signals

| Area                    | Signal                          | Notes                                                                                                                 |
|-------------------------|---------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| Auth (OAuth2 + JWT)     | External integration            | Spring Security 7 OAuth2 Client flow customisation + httpOnly cookie issuance post-redirect; non-trivial filter chain |
| Step content validation | Algorithmic                     | Type-discriminated JSONB validation; field-clear on type change                                                       |
| Positional reorder      | Algorithmic                     | Batch UPDATE with gapless sequence maintenance; must handle concurrent requests safely                                |
| Cross-phase step move   | Workflow + transaction          | Atomic remove + reinsert across two phases; position compaction in both phases                                        |
| Publish snapshot        | Workflow + transaction          | Deep-copy of phases+steps graph to JSONB; version label computation; full rollback on failure                         |
| Markdown import         | External integration + workflow | commonmark-java AST traversal; base64 image extraction; MinIO upload; in-memory session with TTL                      |
| Import confirm          | Stateful                        | Must validate preview session existence and TTL before committing                                                     |
| Lock TTL                | Simple but subtle               | Lazy expiry evaluation (`WHERE expires_at > NOW()`); no scheduler needed                                              |

---

## 3. Implementation Approach Options

### Option A: Extend Existing Components

❌ Not applicable — there are no existing domain components to extend. The only shared infrastructure (`Result<T>`,
`DomainError`) is already complete and should be used as-is without modification.

### Option B: Create New Components (Recommended)

Create all domain components following the established package-per-bounded-context pattern. Each package gets its own
Controller → Service → Repository stack plus DTOs.

**Rationale**: Greenfield backend; each domain has a distinct responsibility, lifecycle, and integration surface. The
package-per-domain pattern is explicitly mandated by `structure.md`.

**Integration points with existing infrastructure**:

- All services call `Result.catching { }` at repository boundaries
- All controllers call `.toResponseEntity()` extension (to be created in `common/`)
- `GlobalExceptionHandler` catches unhandled failures and maps to HTTP

**Recommended creation order** (dependency-first):

1. `mvn generate-sources` → jOOQ records available
2. `common/` — `Result.toResponseEntity()`, `GlobalExceptionHandler`, `SecurityConfig`, `JwtUtils`
3. `auth/` — foundation for all other domain authentication
4. `workshop/` — root aggregate; required by phase, step, lock, version
5. `phase/` + `step/` — leaf domain; `step/` requires `StepContentValidator`
6. `lock/` — simple TTL; depends on workshop existence check
7. `version/` — depends on full workshop+phases+steps read
8. `import/` — depends on workshop, phase, step services; most complex

### Option C: Hybrid

Not relevant — no existing code to integrate with.

---

## 4. Implementation Complexity & Risk

| Domain / Component                                                 | Effort | Risk   | Justification                                                                                                     |
|--------------------------------------------------------------------|--------|--------|-------------------------------------------------------------------------------------------------------------------|
| `common/` (GlobalExceptionHandler, `toResponseEntity()`, JwtUtils) | S      | Low    | Clear mapping spec in Req 10; established Spring patterns                                                         |
| `SecurityConfig` + JWT filter                                      | M      | Medium | Spring Security 7 filter chain + OAuth2 success handler → httpOnly cookie; non-trivial but well-documented        |
| `auth/` (OAuth2 + email/password)                                  | M      | Medium | Provider callback handling, user upsert, cookie issuance; enum of 3 providers                                     |
| `workshop/` CRUD                                                   | M      | Low    | Standard CRUD + team scope; pagination with jOOQ; gapless position not needed here                                |
| `phase/` management + reorder                                      | M      | Low    | Positional batch UPDATE; gapless compaction; straightforward with jOOQ DSL                                        |
| `step/` management + move                                          | M      | Medium | Cross-phase atomic move requires single transaction across two phases; position compaction in both                |
| `StepContentValidator`                                             | S      | Low    | Type-discriminated validation; well-defined rules in Req 6                                                        |
| `lock/` TTL locking                                                | S      | Low    | Simple upsert + lazy TTL check; no scheduler                                                                      |
| `version/` publish + restore                                       | M      | Medium | Deep-copy JSONB snapshot; version label auto-increment; full rollback on failure; restore must rebuild draft      |
| `import/` Markdown parse + confirm                                 | L      | High   | commonmark-java AST; base64 extraction; MinIO upload; in-memory session TTL; two-phase commit pattern             |
| jOOQ codegen prerequisite                                          | S      | Medium | `mvn generate-sources` must succeed before any repository can reference records; first task to unblock all others |

**Overall estimate**: L–XL (1–3 weeks depending on team size and parallelism)

---

## 5. Key Constraints for Design Phase

1. **jOOQ codegen first**: `mvn generate-sources` must run successfully against the Liquibase changelog before any
   Repository implementation can import generated records. This is task #1.

2. **`DomainError` is closed**: The current `DomainError` subtypes (`DatabaseError`, `ValidationError`, `NotFoundError`,
   `UnexpectedError`, `StateError`) cover all HTTP status codes needed. Do not add new subtypes — map domain concepts to
   existing subtypes with descriptive messages.

3. **Import session state**: The design must decide the in-memory session store strategy for multi-step import (
   preview → confirm). Recommendation: `ConcurrentHashMap<UUID, ImportSession>` with `expiresAt` checked on access;
   cleanup via `@Scheduled` every 5 min. No Redis/DB needed for current single-instance deployment.

4. **JSONB step content**: `StepContentValidator` must handle the type-to-fields mapping entirely in the service layer.
   The `content` column is untyped JSONB at the DB level; type enforcement is application-side only.

5. **OAuth2 callback + JWT cookie**: Spring Security 7 `OAuth2AuthorizationCodeGrantFilter` handles the redirect; a
   custom `OAuth2AuthenticationSuccessHandler` must issue the JWT cookie and redirect to the frontend. No OAuth library
   on the frontend.

6. **Transaction scope**: Publish, restore, cross-phase move, and cascade delete must each run in a single
   `@Transactional` method. jOOQ `DSLContext.transaction { }` is the alternative if the Spring proxy-based approach
   causes issues with Kotlin.

---

## 6. Research Items for Design Phase

| #    | Item                                                                                        | Why Needed                                                                                       |
|------|---------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| R-01 | Spring Security 7 `OAuth2AuthenticationSuccessHandler` + `httpOnly` cookie issuance pattern | Auth implementation detail; Spring Security 7 changed the handler API vs 6                       |
| R-02 | jOOQ batch positional UPDATE syntax (Kotlin DSL)                                            | Phase/step reorder must update N rows in one statement; syntax differs from single-record update |
| R-03 | jOOQ JSONB operators in Kotlin DSL                                                          | Step content read/write uses `->>` and `@>` operators; confirm correct jOOQ 3.20 API surface     |
| R-04 | commonmark-java AST visitor API for H2/H3 extraction                                        | Markdown import phase/step mapping depends on AST node types                                     |
| R-05 | Apache Tika content detection API (core, no parsers)                                        | Server-side MIME validation for uploaded files (Req 9 NFR S-04)                                  |
| R-06 | AWS SDK v2 async vs sync S3Client for MinIO uploads                                         | Sync client simpler with Spring MVC blocking; confirm MinIO S3 path-style addressing             |

---

## 7. Recommendations

**Proceed to design phase** — all architectural decisions are resolved; the gap is 100% implementation (no unknowns
blocking design). The design should:

1. Define all Kotlin interfaces (Controller, Service, Repository) and request/response DTO shapes
2. Specify the `GlobalExceptionHandler` → HTTP mapping implementation
3. Specify `StepContentValidator` type-dispatch logic
4. Specify the import session state contract
5. Address the 6 research items above (can be done inline in the design document)

**Run first**:

```bash
mise run backend:codegen  # generates jOOQ Kotlin records from Liquibase changelogs
```

This unblocks all repository implementations and should be the first task in `tasks.md`.

---
_Analysis approach: gap-analysis.md framework — Option B (New Components)_
