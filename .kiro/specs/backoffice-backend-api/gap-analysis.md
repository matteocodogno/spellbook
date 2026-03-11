# Gap Analysis — backoffice-backend-api

_Updated: 2026-03-11 — post design regeneration and migration update_

---

## Analysis Summary

- **Approach**: New components (Option B) — all domain logic is greenfield; shared infrastructure is in place
- **Infrastructure ready**: `Result<T>`, `DomainError`, jOOQ codegen (7 records), Liquibase schema (with rollback), Spring Modulith BOM, `application.yml` baseline
- **Design aligned**: `design.md` reflects the 4-module Spring Modulith architecture; `DesignOperations` interface defined; no `@ControllerAdvice`
- **All domain modules empty**: `auth/`, `design/`, `import/` have zero Kotlin source files — full greenfield implementation
- **One open conflict**: JWT library (`jjwt:0.12.6` in `pom.xml` vs Spring `JwtEncoder`/`JwtDecoder` in `design.md`) — must be resolved before auth implementation

---

## 1. Existing Infrastructure — Current State

### Shared Kernel (`common/`)

| Artifact | Status | Notes |
|---|---|---|
| `Result<T>` sealed class | ✅ Implemented | `Success`, `Failure`, `map`, `flatMap`, `fold`, `catching`, `recover`, `onSuccess`, `onFailure` |
| `DomainError` sealed class | ✅ Implemented | `DatabaseError`, `ValidationError` (with `FieldError`), `NotFoundError`, `UnexpectedError`, `StateError` |
| `common/ext/ResultExt.kt` | ❌ Missing | `Result.toResponseEntity()` + `DomainError.toResponseEntity()` must be created |

### Database

| Artifact | Status | Notes |
|---|---|---|
| Liquibase changelogs | ✅ Complete | 7 tables with `-- comment:` and `-- rollback` on all changesets |
| H2 compatibility | ✅ Done | `TIMESTAMP WITH TIME ZONE`, `JSON` in main changesets; `dbms:postgresql` changesets for JSONB/GIN |
| jOOQ records | ✅ Generated | All 7 table records generated at `generate-sources` |

### Configuration

| Artifact | Status | Notes |
|---|---|---|
| `application.yml` | ✅ Present | datasource, Liquibase, Google + GitHub + X OAuth2, MinIO, JWT, CORS all configured |
| X OAuth2 | ✅ Added | Registered as `x` in `application.yml` |
| `@EnableScheduling` | ✅ Added | On `StageboardApplication`; needed for `@Scheduled` import preview cleanup (Req 9.7) |

### Build / Maven

| Artifact | Status | Notes |
|---|---|---|
| `jooq-codegen-maven` | ✅ Configured | `rootPath` + `KotlinGenerator` + H2-compatible changelog |
| `spring-modulith-bom:2.0.3` | ✅ Declared | |
| `spring-modulith-starter-core` | ✅ Declared | |
| `spring-modulith-starter-test` | ✅ Declared | |

### Tests

| Artifact | Status | Notes |
|---|---|---|
| `StageboardApplicationTests` | ✅ Basic context load | |
| Module boundary tests (`@ApplicationModuleTest`) | ❌ Missing | Required per `backend.md` §6 for all 3 modules |

---

## 2. Resolved Since Previous Analysis

The following issues were flagged in the prior gap analysis and are now resolved:

| Issue | Resolution |
|---|---|
| `design.md` flat package layout | ✅ Regenerated with `design/internal/{workshop,phase,step,lock,version}/` |
| `DesignOperations` interface undefined | ✅ Contract defined in `design.md` |
| `@ControllerAdvice` conflict | ✅ Removed from design.md; `Result.toResponseEntity()` approach documented |
| jOOQ ADR-001 showing old `scripts` path config | ✅ Updated to `rootPath` config |
| Liquibase changesets missing comment + rollback | ✅ All changesets updated |
| ADR-002 for Spring Modulith missing | ✅ Added to design.md |

---

## 3. Open Conflict — JWT Library

`pom.xml` declares `jjwt-api/impl/jackson:0.12.6`. `design.md` references Spring's `JwtEncoder`/`JwtDecoder` (from `spring-boot-starter-oauth2-resource-server`).

**Option A — Keep JJWT** (already declared):
- ✅ No new dependency; simpler setup
- ❌ Manual `SecurityContext` integration; not idiomatic with Spring Security 7
- ❌ `JwtAuthenticationToken` from Spring requires a Spring `Jwt` object, not a JJWT `Claims`

**Option B — Switch to Spring Resource Server JWT** (matches design.md):
- ✅ `JwtAuthenticationToken` is a first-class Spring Security construct; integrates natively with `SecurityContext`
- ✅ `JwtEncoder`/`JwtDecoder` beans auto-configured by `spring-boot-starter-oauth2-resource-server`
- ❌ Adds a dependency (but `spring-security-oauth2-resource-server` is already transitively present via `spring-boot-starter-oauth2-client`)

**Recommendation**: Option B — remove `jjwt` from `pom.xml`; rely on Spring's `NimbusJwtEncoder`/`NimbusJwtDecoder` backed by `app.jwt.secret`. Aligns with `design.md` and is already implied by the existing `spring-security-oauth2-client` dependency.

---

## 4. Implementation Gaps by Module

### 4.1 `common/ext/` — Shared Extension (Effort: S)

| Component | Status |
|---|---|
| `ResultExt.kt` — `Result<T>.toResponseEntity()` | ❌ Missing |
| `DomainError.toResponseEntity()` | ❌ Missing |

Special HTTP mappings needed:
- `ValidationError(code = "FILE_TOO_LARGE")` → 413
- `ValidationError(code = "UNSUPPORTED_MIME")` → 415
- `ValidationError(code = "EMPTY_WORKSHOP")` → 422

### 4.2 `auth/` Module (Effort: L, Risk: Medium)

All components missing:

| Component | Purpose |
|---|---|
| `UserRepository` | Upsert by `(oauth_provider, oauth_sub)`, find by email/id |
| `JwtCookieSuccessHandler` | OAuth success: upsert user+team, issue httpOnly JWT cookie |
| `JwtCookieAuthenticationFilter` | `OncePerRequestFilter` — read `session` cookie, populate `SecurityContext` |
| `SecurityConfig` | `SecurityFilterChain`: OAuth2 client, JWT filter, CORS |
| `AuthService` | bcrypt login (constant-time, no enumeration), `me()`, `logout()` |
| `AuthController` | `GET /api/auth/{provider}`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |

Also needed:
- Custom `OAuth2UserService` for X non-OIDC profile mapping (X doesn't support OIDC; profile response requires manual mapping to `UserPrincipal`)

### 4.3 `design/` Module (Effort: XL, Risk: Low)

All sub-contexts are greenfield but follow identical patterns:

| Sub-context | Components |
|---|---|
| Module root | `DesignOperations.kt`, `WorkshopDto.kt` (public cross-module DTOs) |
| `workshop/` | `Workshop`, `WorkshopSummary`, `WorkshopRepository`, `WorkshopService`, `WorkshopController` |
| `phase/` | `Phase`, `PhaseRepository`, `PhaseService`, `PhaseController` |
| `step/` | `Step`, `StepUpdatePayload` sealed hierarchy, `StepContentValidator`, `StepRepository`, `StepService`, `StepController` |
| `lock/` | `LockRepository`, `LockService`, `LockController` |
| `version/` | `VersionRepository`, `VersionService`, `VersionController` |

Risk is Low — patterns are fully specified in `design.md`; jOOQ records exist for all tables.

### 4.4 `import/` Module (Effort: M, Risk: Medium)

| Component | Risk Note |
|---|---|
| `S3Client` bean config | MinIO endpoint override + path-style access |
| `AssetService` | Straightforward S3 PutObject |
| `MarkdownImportService` | CommonMark AST traversal; base64 image extraction; in-memory preview store |
| `ImportController` | Multipart upload + confirm flow |

Risk: Medium — CommonMark AST traversal and `@Scheduled` preview cleanup add non-trivial logic; `DesignOperations.appendContent()` integration must be verified.

### 4.5 Spring Modulith Declarations (Effort: S)

| Artifact | Status |
|---|---|
| `@ApplicationModule(type = Type.OPEN)` on `common` | ❌ Missing (`package-info.kt`) |
| `AuthModuleTest` | ❌ Missing |
| `DesignModuleTest` | ❌ Missing |
| `ImportModuleTest` | ❌ Missing |

### 4.6 Application Configuration (Effort: S)

| Config | Status |
|---|---|
| `@EnableScheduling` on `StageboardApplication` | ✅ Added |
| X OAuth2 registration | ✅ Added to `application.yml` (registered as `x`) |

---

## 5. Requirement-to-Asset Map

| Req | Summary | Asset Status |
|---|---|---|
| 1.1–1.9 | Auth & Session | ❌ All missing |
| 2.1–2.5 | Team Isolation | ❌ Service-layer `teamId` scoping not yet implemented |
| 3.1–3.8 | Workshop CRUD | ❌ All missing |
| 4.1–4.6 | Phase Management | ❌ All missing |
| 5.1–5.8 | Step Management | ❌ All missing |
| 6.1–6.5 | Step Content Validation | ❌ All missing |
| 7.1–7.8 | Workshop Versioning | ❌ All missing |
| 8.1–8.8 | Pessimistic Locking | ❌ All missing |
| 9.1–9.9 | Markdown Import | ❌ All missing |
| 10.1–10.7 | Error Handling | ⚠️ `Result<T>` + `DomainError` exist; `toResponseEntity()` extension missing |
| 11.1–11.7 | Data Persistence | ✅ Schema + jOOQ records; ❌ repositories not implemented |

---

## 6. Overall Effort & Risk

| Module | Effort | Risk | Justification |
|---|---|---|---|
| `common/ext/` | S | Low | Pure extension functions; patterns fully specified |
| `auth/` | L | Medium | OAuth2 multi-provider + JWT cookie filter; X/Twitter non-OIDC requires custom mapping |
| `design/` | XL | Low | Large surface area but all sub-contexts follow identical pattern; jOOQ records ready |
| `import/` | M | Medium | CommonMark AST + async session store; `DesignOperations` integration required |
| Module declarations | S | Low | Annotations + test stubs only |

---

## 7. Recommended Implementation Order

1. **Resolve JWT library** (pom.xml) — unblocks all auth work
2. **`common/ext/ResultExt.kt`** — all controllers depend on this
3. **`auth/` module** — all other modules require authentication
4. **`design/` module** — implement in order: workshop → phase → step → lock → version
5. **`import/` module** — depends on `DesignOperations` being implemented
6. **Module declarations + `@ApplicationModuleTest`** — add alongside each module

---

## 8. What Is Not a Gap

- Database schema — complete with comments and rollback
- jOOQ records — generated for all 7 tables
- `Result<T>` / `DomainError` — fully implemented
- Maven build (jOOQ codegen, Kotlin compiler, Spring Modulith BOM)
- `application.yml` baseline (datasource, Liquibase, Google/GitHub OAuth2, MinIO, JWT, CORS)
- Spring Modulith runtime + test dependencies
- All 11 functional requirements — well-specified in `requirements.md`
- Technical design — fully aligned with Spring Modulith 4-module architecture in `design.md`
