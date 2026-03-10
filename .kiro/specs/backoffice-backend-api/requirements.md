# Requirements Document

## Project Description (Input)

Backoffice Backend API — a Spring Boot / Kotlin REST API that persists all workshop content (workshops, phases, steps,
versions, locks) to PostgreSQL and serves the REST contracts defined in the frontend spec
(`.kiro/specs/backoffice-content-authoring/design.md`). Includes OAuth2/OIDC + email-password auth (Google, X/Twitter,
GitHub), pessimistic workshop locking with TTL, Markdown import with asset handling, and workshop versioning with
immutable snapshots.

## Coding Principles (Mandatory)

The following principles are non-negotiable and must be reflected in all requirements and design decisions:

### 1. Functional Core — `Result<T>` + `DomainError`

Every operation that can fail returns `Result<T>` (the project's sealed class). No method throws a checked or unchecked
exception as a primary control-flow mechanism. Exceptions are caught at infrastructure boundaries (`Result.catching { }`
) and converted to `DomainError` variants.

```kotlin
// Existing infrastructure — do NOT redesign, USE as-is:
// ch.welld.soa.automation.common.model.Result<T>        (Success / Failure)
// ch.welld.soa.automation.common.model.DomainError      (DatabaseError / ValidationError /
//                                                         NotFoundError / UnexpectedError / StateError)
```

Available `DomainError` subtypes and their HTTP mapping:

| DomainError        | HTTP Status |
|--------------------|-------------|
| `ValidationError`  | 400         |
| `NotFoundError`    | 404         |
| `StateError`       | 409         |
| `DatabaseError`    | 500         |
| `UnexpectedError`  | 500         |

### 2. Composition over Inheritance

- Prefer function composition (`map`, `flatMap`, `fold`, `recoverWith`) over class hierarchies.
- Service methods chain `Result` transformations; they do not contain nested `if/try/catch` blocks.
- Shared behaviour is extracted to extension functions or standalone functions, not base classes.

### 3. Immutability and Pure Functions

- Domain model objects are `data class` with `val` fields — never mutate in place.
- Service functions receive input and return `Result<Output>`; no side effects outside of the repository layer.
- Business rules are expressed as pure functions that take domain objects and return `Result`.

### 4. Kotlin Idioms

- Use `sealed class` for discriminated unions (already used in `Result` and `DomainError`).
- Use `data class` for value objects and DTOs.
- Prefer `when` expressions (exhaustive) over `if-else` chains.
- Use Kotlin extension functions to add behaviour to existing types without inheritance.

## Requirements

<!-- Will be generated in /kiro:spec-requirements phase -->
