# Backend Engineering Standards — Spring Boot / Kotlin

## Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Language | Kotlin (JVM) | Functional idioms preferred |
| Framework | Spring Boot 3.x | Web MVC or WebFlux (TBD per spec) |
| Database | PostgreSQL | JPA/Hibernate or jOOQ (TBD per spec) |
| Auth | Spring Security + OAuth2 Resource Server | Google, X/Twitter, GitHub, email+password |
| Build | Gradle (Kotlin DSL) | |

---

## Non-Negotiable Coding Principles

### 1. `Result<T>` is the error-handling contract

Every operation that can fail **must** return `Result<T>` from `ch.welld.soa.automation.common.model`.
No service or domain method propagates exceptions as primary control flow.

```kotlin
// ✅ Correct
fun findWorkshop(id: UUID): Result<Workshop>

// ❌ Wrong
fun findWorkshop(id: UUID): Workshop  // throws NotFoundException
```

Use `Result.catching { }` at infrastructure boundaries (repository calls, external HTTP, file I/O).
Use `map`, `flatMap`, `fold`, `recoverWith` to chain operations without nesting.

**DomainError → HTTP status mapping** (enforced in the global exception handler / controller advice):

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

- Controllers convert `Result<T>` to `ResponseEntity` via a shared `Result.toResponseEntity()` extension.
- Services own business logic; they never reference Spring MVC types.
- Repositories return `Result<T>`; they never throw.
- Domain types never reference Spring or JPA annotations.

---

## Existing Shared Infrastructure

Located in `ch.welld.soa.automation.common.model`:

- `Result<T>` — `Success(value)` / `Failure(error)` sealed class with `map`, `flatMap`, `fold`, `catching`, etc.
- `DomainError` — `DatabaseError` / `ValidationError` / `NotFoundError` / `UnexpectedError` / `StateError`
- Domain-specific exceptions: `DatabaseException`, `ValidationException`, `NotFoundException`, `UnexpectedException`

**Do not redesign or duplicate these.** All new code imports and uses them directly.
