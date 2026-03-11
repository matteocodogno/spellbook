# Backend Engineering Standards — Spring Boot / Kotlin

## Stack

| Layer | Choice                                      | Notes |
|-------|---------------------------------------------|-------|
| Language | Kotlin 2.3.x (JVM 21)                       | Functional idioms; no Java source files |
| Framework | Spring Boot 4.0.x — **Spring MVC** (blocking) | No WebFlux / Reactor / Coroutines in API layer |
| Database access | **jOOQ 3.20.x** (`jooq` + `jooq-kotlin`)   | Type-safe SQL DSL + Kotlin extensions; direct JSONB support; no JPA/Hibernate |
| jOOQ codegen | `jooq-codegen-maven` plugin + `jooq-meta-extensions-liquibase` | Generates Kotlin record classes from Liquibase changelogs at `generate-sources`; no live DB needed |
| Database | PostgreSQL 16                               | Primary store for all workshop content |
| Asset store | **MinIO** (S3-compatible) via AWS S3 SDK v2 2.42.x | Imported image assets; env-configured bucket + endpoint |
| Auth | Spring Security 7 + OAuth2 / email+password | Google, X/Twitter, GitHub; httpOnly JWT cookie |
| Schema migrations | **Liquibase 5.x** (`liquibase-spring-boot-starter`) | SQL format changelogs (`db/changelog/changes/*.sql`); auto-applied at startup |
| Module boundaries | **Spring Modulith 2.0.x** | Enforces package-level module isolation at test time |
| Build | Maven + `kotlin-maven-plugin` + `spring-boot-maven-plugin` | `jooq-codegen-maven` bound to `generate-sources`; `mvn spring-boot:run` for local dev |

---

## Non-Negotiable Coding Principles

### 1. `Result<T>` is the error-handling contract

Every operation that can fail **must** return `Result<T>` from `io.stageboard.spellbook.common.model`.
No service or domain method propagates exceptions as primary control flow.

```kotlin
// ✅ Correct
fun findWorkshop(id: UUID): Result<Workshop>

// ❌ Wrong
fun findWorkshop(id: UUID): Workshop  // throws NotFoundException
```

Use `Result.catching { }` at infrastructure boundaries (repository calls, external HTTP, file I/O).
Use `map`, `flatMap`, `fold`, `recoverWith` to chain operations without nesting.

**DomainError → HTTP status mapping** (enforced via `Result.toResponseEntity()` — no `@ControllerAdvice`):

| DomainError       | HTTP |
|-------------------|------|
| ValidationError   | 400  |
| NotFoundError     | 404  |
| StateError        | 409  |
| DatabaseError     | 500  |
| UnexpectedError   | 500  |

### 2. Composition over Inheritance

- Shared behaviour → extension functions or standalone top-level functions.
- No abstract base services or base repositories beyond framework interfaces.
- Prefer function pipelines: `validate(input).flatMap { save(it) }.map { toDto(it) }`.

### 3. Immutability

- Domain and DTO types are `data class` with `val` fields exclusively.
- No `var` in domain or service layer. Mutation is limited to the persistence layer mapping.

### 4. Kotlin Idioms

- `sealed class` for discriminated unions.
- `when` expressions — always exhaustive (no else-only branches on sealed types).
- Extension functions over utility classes.
- Avoid `!!` — use `?: return Result.failure(DomainError.NotFoundError(...))` pattern.

### 5. Layer Boundaries

```
Controller  →  Service  →  Repository  →  Database
    ↕              ↕
  DTO            Domain
```

- Controllers convert `Result<T>` to `ResponseEntity` via a shared `Result.toResponseEntity()` extension. There is **no `@ControllerAdvice`**.
- All exceptions are caught inside services and repositories using `Result.catching { }` — no exception propagates past the service layer.
- Services own business logic; they never reference Spring MVC types.
- Repositories return `Result<T>`; they never throw.
- Domain types never reference Spring or JPA annotations.

### 6. Spring Modulith — Module Boundaries

The application is structured as a set of **Spring Modulith modules**. Each top-level package under `io.stageboard.spellbook` is a module (except `common`, which is an open shared kernel).

#### Package layout per module

```
io.stageboard.spellbook.{module}/
├── {Module}Operations.kt   # Public interface — the only cross-module entry point
├── {Domain}Dto.kt          # Public DTOs returned by Operations (data class, val only)
└── internal/               # Private to the module; invisible to other modules
    ├── {Domain}.kt         # Domain model
    ├── {Module}Controller.kt
    ├── {Module}Service.kt
    └── {Module}Repository.kt
```

#### Rules

- **Cross-module access only via `{Module}Operations`**: other modules must call the interface, never touch internal classes directly.
- **No leaking of domain or repository types**: the interface returns DTOs defined in the module's root package, never internal domain objects.
- **`internal/` subpackage is enforced by Spring Modulith**: any violation is detected as a test failure by `ApplicationModuleTest`.
- **`common` is an open module** (`@ApplicationModule(type = Type.OPEN)`): its `Result<T>`, `DomainError`, and extension functions are visible to all modules without going through an Operations interface.
- **No circular dependencies between modules**: if A calls B, B must not call A. Use Spring application events (`ApplicationEventPublisher`) for decoupled notifications.

#### Cross-module dependency map

| Module | Calls | Purpose |
|--------|-------|---------|
| `edition` | `DesignOperations` | Read published workshop content for live delivery |
| `import` | `DesignOperations` | Write imported structure into workshop draft |

`design` is internally divided into sub-contexts (`workshop`, `phase`, `step`, `lock`, `version`) inside `internal/`. These sub-contexts communicate directly — they are all private to the `design` module and do not need an Operations interface between them.

#### Modulith verification test

Every module must have a corresponding Modulith test that verifies its boundaries at CI time:

```kotlin
@ApplicationModuleTest
class WorkshopModuleTest(module: ApplicationModule) {
    @Test
    fun verifyModule() { module.verify() }
}
```

### 7. jOOQ Code Generation

jOOQ Kotlin records are generated **automatically** during the Maven `generate-sources` lifecycle phase via `jooq-codegen-maven`. No manual codegen step is needed — every `mvn compile` or `mvn package` regenerates records from the Liquibase changelogs. Run `mise run backend:codegen` only when you need to inspect the generated code without a full build.

---

## Existing Shared Infrastructure

Located in `io.stageboard.spellbook.common.model`:

- `Result<T>` — `Success(value)` / `Failure(error)` sealed class with `map`, `flatMap`, `fold`, `catching`, etc.
- `DomainError` — `DatabaseError` / `ValidationError` / `NotFoundError` / `UnexpectedError` / `StateError`
- Domain-specific exceptions: `DatabaseException`, `ValidationException`, `NotFoundException`, `UnexpectedException`

**Do not redesign or duplicate these.** All new code imports and uses them directly.
