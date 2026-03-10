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
exception as a primary control-flow mechanism. Exceptions are caught at infrastructure boundaries (`Result.catching { }`)
and converted to `DomainError` variants.

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

---

## Requirements

### Requirement 1: Authentication and Session Management

**Objective:** As a Content Author, I want to authenticate via OAuth or email/password so that my identity and team
membership are verified before I can access any backoffice resource.

#### Acceptance Criteria

1. When a user initiates the OAuth flow by navigating to `/api/auth/{provider}` (where `provider` is `google`, `github`,
   or `x`), the API shall redirect the user to the provider's authorization endpoint with the correct OAuth2 parameters.
2. When the OAuth provider redirects back to the API callback URL with a valid authorization code, the API shall exchange
   the code for tokens, retrieve the user profile, create or update the user record, and set an httpOnly JWT cookie.
3. When a user submits valid email and password to `POST /api/auth/login`, the API shall verify credentials, and if
   valid, set an httpOnly JWT cookie containing a signed token.
4. If a user submits an incorrect password or unknown email to `POST /api/auth/login`, the API shall return 401 with a
   generic error message (no username enumeration).
5. When an authenticated user calls `GET /api/auth/me`, the API shall return the current user's id, name, email, and
   teamId.
6. When an authenticated user calls `POST /api/auth/logout`, the API shall invalidate the session and clear the httpOnly
   cookie.
7. The API shall reject all requests to protected endpoints that do not carry a valid session cookie with HTTP 401.
8. The API shall issue JWT tokens with an expiry of 24 hours; the cookie shall have `HttpOnly`, `SameSite=Strict`, and
   `Secure` attributes.
9. If a JWT token is expired or tampered with, the API shall return 401 on the next protected request.

---

### Requirement 2: Team Isolation and Authorization

**Objective:** As a platform operator, I want all data access strictly scoped to the authenticated user's team so that
no cross-team data leakage is possible.

#### Acceptance Criteria

1. The API shall associate every workshop with the `teamId` of the user who created it; all subsequent reads and writes
   on that workshop are permitted only to members of the same team.
2. When a user attempts to read or modify a workshop belonging to a different team, the API shall return 403.
3. The API shall enforce team scoping at the service layer using the authenticated principal's `teamId`, not via
   client-supplied parameters.
4. If a user attempts to access a phase or step that belongs to a workshop outside their team, the API shall return 403.
5. The API shall never include workshops, phases, or steps belonging to other teams in any list or search response.

---

### Requirement 3: Workshop CRUD

**Objective:** As a Content Author, I want full create, read, update, and delete operations on workshops so that I can
manage the library of available training content.

#### Acceptance Criteria

1. When an authenticated user sends `POST /api/workshops` with a non-empty title, the API shall persist the workshop
   associated with the user's team and return 201 with the created `Workshop` resource.
2. When an authenticated user sends `GET /api/workshops`, the API shall return 200 with a paginated list of all
   workshops belonging to the user's team, sorted by `draftModifiedAt` descending.
3. When an authenticated user sends `GET /api/workshops/:id` for a workshop in their team, the API shall return 200 with
   the full `Workshop` resource including embedded phases and steps.
4. When an authenticated user sends `PUT /api/workshops/:id` with updated fields, the API shall persist the changes,
   update `draftModifiedAt` and `lastEditorId`, and return 200 with the updated `Workshop`.
5. When an authenticated user sends `DELETE /api/workshops/:id`, the API shall cascade-delete all phases, steps, version
   history, and the lock record, then return 204.
6. If `POST /api/workshops` is sent with a missing or blank title, the API shall return 400 with a field-level
   validation error.
7. If `GET /api/workshops/:id`, `PUT /api/workshops/:id`, or `DELETE /api/workshops/:id` targets a non-existent id,
   the API shall return 404.
8. The API shall support pagination for `GET /api/workshops` with a default page size of 20 and a maximum of 100.

---

### Requirement 4: Phase Management

**Objective:** As a Content Author, I want to create, update, delete, and reorder phases within a workshop so that the
workshop structure can be organised and maintained.

#### Acceptance Criteria

1. When an authenticated user sends `POST /api/workshops/:workshopId/phases` with a title and `estimatedMinutes`, the
   API shall append the phase at the end of the phase list, assign the next available position value, and return 201
   with the created `Phase`.
2. When an authenticated user sends `PUT /api/workshops/:workshopId/phases/:phaseId` with updated fields, the API shall
   persist the changes and return 200 with the updated `Phase`.
3. When an authenticated user sends `DELETE /api/workshops/:workshopId/phases/:phaseId`, the API shall cascade-delete
   all steps within that phase and return 204; remaining phases shall have their position values compacted to maintain a
   gapless sequence.
4. When an authenticated user sends `PATCH /api/workshops/:workshopId/phases/order` with a complete ordered list of
   phase IDs, the API shall update the `position` field of each phase to match the provided order and return 200.
5. If the ordered ID list in `PATCH .../phases/order` does not contain exactly all phase IDs belonging to the workshop,
   the API shall return 400.
6. If `estimatedMinutes` is zero, negative, or non-numeric, the API shall return 400.

---

### Requirement 5: Step Management

**Objective:** As a Content Author, I want to create, update, delete, reorder, and move steps so that workshop content
can be organised at the atomic level.

#### Acceptance Criteria

1. When an authenticated user sends `POST /api/phases/:phaseId/steps` with a valid step type and title, the API shall
   create the step at the end of that phase's step list, assign the next available position value, and return 201 with
   the created `Step`.
2. When an authenticated user sends `PATCH /api/phases/:phaseId/steps/:stepId` with a `StepUpdatePayload` matching the
   step's declared type, the API shall update only the provided fields and return 200 with the full updated `Step`.
3. If the `type` field in a `StepUpdatePayload` does not match the persisted step type, the API shall return 400.
4. When an authenticated user sends `DELETE /api/phases/:phaseId/steps/:stepId`, the API shall remove the step and
   compact remaining positions within the phase, then return 204.
5. When an authenticated user sends `PATCH /api/phases/:phaseId/steps/order` with a complete ordered list of step IDs
   for that phase, the API shall update positions and return 200.
6. When an authenticated user sends `PATCH /api/phases/:phaseId/steps/:stepId/move` with a `targetPhaseId` and
   `position`, the API shall atomically remove the step from the source phase and insert it at the target position in
   the target phase, then return 200 with the updated `Step`.
7. If the ordered ID list in `PATCH .../steps/order` does not contain exactly all step IDs for the phase, the API shall
   return 400.
8. If `targetPhaseId` in a move request belongs to a different workshop than the source phase, the API shall return 400.

---

### Requirement 6: Step Content Validation by Type

**Objective:** As a platform operator, I want step content validated against its declared type so that invalid or
incomplete steps cannot be persisted.

#### Acceptance Criteria

1. When the step type is `poll` and the `options` array contains fewer than 2 entries at save time, the API shall return
   400 with a field-level validation error on `options`.
2. When the step type is `poll` and the `options` array contains more than 8 entries, the API shall return 400.
3. When the step type is `break` and `durationMinutes` is present but zero or negative, the API shall return 400.
4. The API shall ignore fields that are not defined for the given step type (e.g. `options` on a `theory` step) and
   neither persist nor return them.
5. When a step type is changed (e.g. from `poll` to `theory`), the API shall clear all fields that are exclusive to
   the previous type and are not present in the new type.

---

### Requirement 7: Workshop Versioning and Publishing

**Objective:** As a Content Author, I want to publish immutable versioned snapshots of a workshop so that live sessions
always use stable content while the draft continues to evolve.

#### Acceptance Criteria

1. When an authenticated user sends `POST /api/workshops/:id/publish`, the API shall create an immutable
   `WorkshopVersion` record with an auto-incremented version label (e.g. `1.0`, `1.1`) and an optional user-supplied
   tag, then return 200 with the created `WorkshopVersion`.
2. The API shall compute the version label by incrementing the minor version of the latest published version (e.g.
   `1.0` → `1.1`), starting from `1.0` for the first publish.
3. The publish operation shall be executed within a single database transaction; if any part fails, the API shall roll
   back and return 500 with no partial version created.
4. When an authenticated user sends `GET /api/workshops/:id/versions`, the API shall return all published versions for
   that workshop sorted by `publishedAt` descending.
5. When an authenticated user sends `POST /api/workshops/:id/versions/:versionId/restore`, the API shall deep-copy the
   version snapshot back to the workshop's draft content (phases and steps), update `draftModifiedAt`, and return 200.
6. If `POST /api/workshops/:id/publish` is called on a workshop with no phases, the API shall return 422.
7. If `POST /api/workshops/:id/publish` is called on a workshop where any phase has no steps, the API shall return 422.
8. The snapshot stored in a `WorkshopVersion` record shall be immutable; no subsequent API call shall modify it.

---

### Requirement 8: Pessimistic Workshop Locking

**Objective:** As a platform operator, I want workshop-level pessimistic locks to prevent concurrent editing by multiple
users so that data consistency is maintained.

#### Acceptance Criteria

1. When an authenticated user sends `POST /api/workshops/:id/lock` and no lock is currently held (or the existing lock
   has expired), the API shall create a lock record with `lockedBy`, `lockedAt`, and `expiresAt` (TTL = 120 seconds),
   and return 200 with `{ "held": true }`.
2. When an authenticated user sends `POST /api/workshops/:id/lock` and a non-expired lock is held by a different user,
   the API shall return 409 with `{ "lockedBy": "<name>", "lockedAt": "<ISO-8601>" }`.
3. When the lock holder sends `PUT /api/workshops/:id/lock` (heartbeat), the API shall extend `expiresAt` by 120
   seconds from the current time and return 200.
4. If a non-holder sends `PUT /api/workshops/:id/lock`, the API shall return 409.
5. When the lock holder sends `DELETE /api/workshops/:id/lock`, the API shall remove the lock record and return 204.
6. The API shall treat any lock whose `expiresAt` is in the past as non-existent; expired locks shall be automatically
   superseded on the next `POST /api/workshops/:id/lock` request.
7. While a valid lock is held by another user, the API shall still allow read operations (`GET`) on the workshop.
8. If `POST /api/workshops/:id/lock` is sent for a non-existent workshop, the API shall return 404.

---

### Requirement 9: Markdown Import

**Objective:** As a Content Author, I want to upload a Markdown file and receive a structured preview of inferred phases
and steps before committing the import.

#### Acceptance Criteria

1. When an authenticated user sends `POST /api/workshops/:id/import/markdown` with a multipart file, the API shall
   parse the Markdown, map H2 headings to phases and H3 headings to steps, and return 200 with an `ImportPreview`
   response.
2. If the uploaded file exceeds 5 MB, the API shall return 413 before attempting to parse.
3. If the uploaded file's MIME type (validated server-side, not from the `Content-Type` header alone) is not
   `text/markdown` or `text/plain`, the API shall return 415.
4. When the Markdown file contains no H2 headings, the API shall treat the entire document as a single phase and map
   H3 headings to steps; if no H3 headings exist, the entire content is mapped to a single Theory step.
5. Where a Markdown section contains a fenced code block with a language tag, the API shall map it to the step's `code`
   field and preserve the language tag in `codeLanguage`.
6. When the Markdown file contains inline base64-encoded images (`data:image/...;base64,...`), the API shall extract
   each image, upload it to the asset store, and rewrite the image reference in the content to the hosted URL before
   returning the preview.
7. External image URLs (e.g. `![alt](https://...)`) shall be preserved as-is in the preview content.
8. When an authenticated user sends `POST /api/workshops/:id/import/markdown/confirm` with a `ConfirmImportInput`,
   the API shall append only the phases and steps with `action: "include"` to the workshop draft and return 200 with
   the updated `Workshop`.
9. If the `ConfirmImportInput` references phase or step entries not present in a previous preview call for the same
   workshop, the API shall return 400.

---

### Requirement 10: Error Handling and Result Contract

**Objective:** As a developer integrating the API, I want all error responses to follow a consistent structure so that
the frontend can map errors predictably.

#### Acceptance Criteria

1. The API shall return all errors as JSON objects with at minimum `{ "error": "<message>", "code": "<DomainError
   subtype>" }`.
2. When a `DomainError.ValidationError` is produced, the API shall return 400 and include a `fields` array listing each
   invalid field and its message.
3. When a `DomainError.NotFoundError` is produced, the API shall return 404.
4. When a `DomainError.StateError` is produced (e.g. lock conflict), the API shall return 409 with contextual payload
   (e.g. `lockedBy`, `lockedAt`).
5. When a `DomainError.DatabaseError` or `DomainError.UnexpectedError` is produced, the API shall return 500 and log
   the full stack trace server-side; the response body shall not expose internal details.
6. The API shall expose a single global `@ControllerAdvice` that converts `Result.Failure` to `ResponseEntity` using the
   `DomainError → HTTP` mapping; no controller shall manually handle exceptions.
7. All `Result.Success` values shall be converted to `ResponseEntity` via a shared `Result.toResponseEntity()`
   extension function, with the HTTP status determined by the operation type (201 for create, 200 for read/update, 204
   for delete).

---

### Requirement 11: Data Persistence and Integrity

**Objective:** As a platform operator, I want all workshop data persisted durably to PostgreSQL with referential
integrity and consistent ordering.

#### Acceptance Criteria

1. The API shall persist workshops, phases, steps, versions, and locks in PostgreSQL; no content shall be held only in
   memory.
2. Phase `position` values within a workshop shall form a gapless integer sequence starting at 0; the API shall
   maintain this invariant on every insert, delete, and reorder operation.
3. Step `position` values within a phase shall form a gapless integer sequence starting at 0; the API shall maintain
   this invariant on every insert, delete, reorder, and cross-phase move operation.
4. Step type-specific fields shall be stored as a JSONB column `content` on the `steps` table; the API shall validate
   JSONB content against the declared `type` on every write.
5. Workshop version snapshots shall be stored as immutable JSONB in `workshop_versions.snapshot`; the API shall never
   update this column after creation.
6. All multi-step write operations (publish, move, reorder, restore, cascade delete) shall execute within a single
   database transaction; partial writes shall not be committed.
7. The API shall use UUIDs as primary keys for all entities.

---

## Non-Functional Requirements

### Performance

| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
| P-01 | Workshop list response time | < 200 ms p95 for up to 200 workshops per team | P0 | Req 3 |
| P-02 | Single workshop detail response | < 300 ms p95 for workshops with up to 20 phases × 30 steps | P0 | Req 3 |
| P-03 | Reorder PATCH response time | < 500 ms p95 | P1 | Req 4, 5 |
| P-04 | Markdown import parse response | < 3 s for a 5 MB file | P1 | Req 9 |
| P-05 | Publish transaction time | < 1 s p95 | P1 | Req 7 |

### Security

| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
| S-01 | Auth coverage | 100% of endpoints (excluding `/api/auth/*`) require a valid session cookie | P0 | Req 1 |
| S-02 | Team isolation | 0 cross-team data leaks; enforced at service layer, not client-supplied params | P0 | Req 2 |
| S-03 | Cookie security | httpOnly, SameSite=Strict, Secure; no token in response body | P0 | Req 1 |
| S-04 | File upload validation | MIME type validated server-side using content inspection, not filename extension | P0 | Req 9 |
| S-05 | No sensitive data in 5xx responses | Stack traces logged server-side only; response body contains no internals | P0 | Req 10 |
| S-06 | CORS | Allowed origins limited to the backoffice SPA origin; `Access-Control-Allow-Credentials: true` | P0 | Req 1 |

### Scalability

| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
| SC-01 | Concurrent sessions | API handles 20 concurrent editing sessions without degradation | P1 | Req 8 |
| SC-02 | Database connections | Connection pool sized for expected concurrency; no connection exhaustion under 50 req/s | P1 | Req 11 |

### Reliability

| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
| R-01 | Publish atomicity | 0 partial versions created on failure; full rollback guaranteed | P0 | Req 7 |
| R-02 | Lock TTL auto-expiry | Expired locks superseded within one TTL cycle (120 s) with no manual intervention | P0 | Req 8 |
| R-03 | Cascade delete integrity | Delete of workshop/phase leaves no orphaned phases/steps/locks in the database | P0 | Req 3, 4 |

### Constraints

| NFR ID | Description | Threshold | Priority | Source Req |
|--------|-------------|-----------|----------|------------|
| C-01 | Language | Kotlin — no Java source files in new code | P0 | All |
| C-02 | Result contract | All fallible operations return `Result<T>`; no exceptions as control flow | P0 | All |
| C-03 | Immutability | No `var` in domain or service layer | P0 | All |
| C-04 | REST contract fidelity | API endpoints, request/response shapes, and status codes must exactly match `.kiro/specs/backoffice-content-authoring/design.md` | P0 | All |
| C-05 | Notion import | Out of scope; no endpoints or stubs | P2 | — |
| C-06 | Database access | jOOQ only — no JPA/Hibernate annotations in domain or repository layer | P0 | Req 11 |
| C-07 | Asset store | MinIO via AWS S3 SDK (S3-compatible API); no filesystem or DB BYTEA storage for images | P0 | Req 9 |
| C-08 | Web layer | Spring MVC (blocking); no WebFlux, Coroutines, or Reactor in the API layer | P0 | All |

---

## Open Questions

| # | Question | Impact | Owner | Status | Decision |
|---|----------|--------|-------|--------|----------|
| 1 | Spring MVC (blocking) or Spring WebFlux (reactive)? WebFlux would change repository types and require a reactive DB driver. | Architecture, Req 3–9 | Tech | Resolved | **Spring MVC** (blocking). Standard thread-per-request model; simpler jOOQ integration; no reactive driver needed. |
| 2 | JPA/Hibernate or jOOQ for database access? jOOQ gives more control over JSONB and positional updates; JPA is more familiar. | Req 4, 5, 11 | Tech | Resolved | **jOOQ**. Type-safe SQL DSL; direct JSONB query support; fine-grained control over positional UPDATE batches; idiomatic with functional Kotlin pipelines. |
| 3 | Where is the asset store for imported images? S3-compatible bucket, local filesystem, or database BYTEA? | Req 9 | Tech/Infra | Resolved | **MinIO** (S3-compatible). Self-hosted; SDK-compatible with AWS S3; suitable for base64 image extraction during Markdown import. |
| 4 | What is the OAuth callback base URL in production? Required for provider registration. | Req 1 | Infra | Open | — |
| 5 | Should the API support refresh tokens (sliding sessions), or is a 24h fixed expiry acceptable? | Req 1 | Product | Open | — |
| 6 | Is rate limiting required on auth endpoints (brute-force protection on `POST /api/auth/login`)? | Security, Req 1 | Tech/Security | Open | — |

---

## Decision Log

| Decision | Detail |
|----------|--------|
| **Spring MVC** | Blocking request model. Aligns with jOOQ's synchronous DSL; no need for Coroutines or Reactor in the persistence layer. Simpler `Result<T>` chain without suspending functions. |
| **jOOQ** | Replaces JPA/Hibernate. Enables type-safe SQL with direct `JSONB` operators (`->>`, `@>`), batch `UPDATE … SET position = …` for reorder operations, and transactional `DSLContext` composable with `Result.catching { dsl.transaction { … } }`. |
| **MinIO (S3-compatible)** | Self-hosted object store for Markdown import image assets. AWS S3 SDK (`software.amazon.awssdk:s3`) used via the S3-compatible API; `bucketName` and endpoint configured via environment variables. Base64 images extracted during import → uploaded to MinIO → URL rewritten to `https://<minio-host>/<bucket>/<uuid>.<ext>` before preview is returned. External URLs are preserved as-is. |
