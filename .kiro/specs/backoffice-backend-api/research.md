# Research & Design Decisions — Backoffice Backend API

---

## Summary

- **Feature**: `backoffice-backend-api`
- **Discovery Scope**: Complex Integration — new Spring Boot/Kotlin service implementing the REST contracts defined in `backoffice-content-authoring/design.md`, including OAuth2/OIDC multi-provider auth, pessimistic locking, JSONB persistence via jOOQ, MinIO asset store, and Markdown import.
- **Key Findings**:
  - Spring MVC (blocking) + jOOQ is the natural pairing: `DSLContext.transaction { }` composes cleanly with `Result.catching { }`, giving atomic multi-step writes without reactive overhead.
  - jOOQ's `JSONB` operator support (`->>`  , `@>`) is critical for step content querying and avoids the impedance mismatch of JPA `@Type` column mappings.
  - MinIO via the AWS S3 SDK (v2) is the lowest-friction path for base64 image asset extraction: `PutObjectRequest` + `GetObjectRequest` over the S3-compatible API; endpoint and bucket are env-configured.

---

## Research Log

### Spring MVC vs. WebFlux

- **Context**: The existing `Result<T>` sealed class uses synchronous `Success`/`Failure` values, not `Mono`/`Flux`. Mixing with WebFlux would require suspending wrappers or Coroutines.
- **Sources Consulted**: Spring Boot 4.0.x / Spring Security 7 documentation, steering `backend.md`
- **Findings**:
  - Spring MVC thread-per-request model integrates directly with `DSLContext` (blocking JDBC).
  - WebFlux would require `r2dbc-postgresql` and async `Result` chaining via `Coroutines` or `Mono.fromCallable`, neither of which is in scope per `C-08`.
  - `@Transactional` on `@Service` beans works identically in MVC and requires no coroutine scope.
- **Implications**: All service methods are regular `fun` (not `suspend`). Confirmed as resolved OQ-1.

### jOOQ for JSONB and Positional Batch Updates

- **Context**: Steps have type-specific JSONB `content`. Phase/step positions must be maintained as gapless integer sequences updated atomically.
- **Sources Consulted**: jOOQ 3.20.x documentation, `JSONB` field binding examples, `jooq-meta-extensions-liquibase` docs
- **Findings**:
  - `DSL.field("content::jsonb")` with `JSONB.jsonb(value)` allows direct insert/update without custom converters.
  - jOOQ `batch(update statements)` or `DSL.update(STEPS).set(STEPS.POSITION, inline(i)).where(STEPS.ID.eq(id))` inside a `dsl.transaction { }` block covers atomic reorder.
  - `DSL.field("content ->> 'type'", String::class.java)` enables filtering by step type without application-side unmarshalling.
  - `org.jooq:jooq-kotlin` provides idiomatic Kotlin extensions: `fetchOne`, `fetchInto`, `intoKotlin`, avoiding Java-style null handling.
  - `org.jooq:jooq-meta-extensions-liquibase` (`LiquibaseDatabase`) reads changelog files at Gradle build time via the `nu.studer.jooq` plugin; no running PostgreSQL needed in CI/CD.
  - `KotlinGenerator` emits `data class` record types and `object`-based table definitions — idiomatic with the functional `Result<T>` pipeline.
- **Implications**: No JPA `@Type` annotations, no Hibernate `ColumnTransformer` hacks. Position compaction is a batch UPDATE in one transaction. Codegen runs offline from Liquibase changelogs; confirmed as resolved OQ-2.

### MinIO / AWS S3 SDK v2 Integration

- **Context**: Markdown import extracts base64 images and must upload them to an object store, returning hosted URLs.
- **Sources Consulted**: AWS SDK v2 (`software.amazon.awssdk:s3`) docs; MinIO compatibility matrix
- **Findings**:
  - MinIO is fully S3-compatible; SDK v2 `S3Client.builder().endpointOverride(URI)` targets MinIO.
  - `PutObjectRequest` with `RequestBody.fromBytes(decoded)` handles byte uploads.
  - URL rewrite pattern: `https://<minio-host>/<bucket>/<UUID>.<ext>` (pre-signed URLs not required for read-public buckets).
  - `ContentType` header must be set from the data URI prefix (`image/png`, `image/jpeg`, etc.).
- **Implications**: `AssetService` is a thin wrapper around `S3Client`; returns `Result<String>` (the hosted URL). Env vars: `MINIO_ENDPOINT`, `MINIO_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Confirmed as resolved OQ-3.

### Spring Security OAuth2/OIDC + Email-Password

- **Context**: Three social providers (Google, GitHub, X/Twitter) plus email/password login; all sessions use httpOnly JWT cookies.
- **Sources Consulted**: Spring Security 6.x OAuth2 Client docs; `spring-boot-starter-oauth2-client` auto-configuration
- **Findings**:
  - `spring-boot-starter-oauth2-client` handles OIDC for Google and GitHub out-of-the-box.
  - X/Twitter uses OAuth 2.0 (not OIDC); a custom `OAuth2UserService` is needed to map the profile response to the internal `User` domain object.
  - Email/password is handled by a custom `UsernamePasswordAuthenticationFilter` and `UserDetailsService` backed by the `users` table (BCrypt password hash).
  - After OAuth or password success: `JwtCookieAuthenticationSuccessHandler` issues a signed JWT (Spring Security 7's `JwtEncoder`) and writes it as `HttpOnly; SameSite=Strict; Secure; Max-Age=86400`.
  - All protected routes are secured via `SecurityFilterChain` with `anyRequest().authenticated()` and `BearerTokenAuthenticationFilter` reading from the cookie.
- **Implications**: `AuthController` exposes `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`. OAuth redirect URIs are provider-registered; production base URL is OQ-4 (still open, design must be env-configured). Refresh tokens are OQ-5; design uses 24h fixed expiry.

### Pessimistic Lock TTL via Database Timestamp

- **Context**: Workshop lock must auto-expire after 120 s without a background job.
- **Findings**:
  - Store `expires_at TIMESTAMPTZ` in `workshop_locks`. On `POST /lock`, check `expires_at > NOW()`; if false (or no row), upsert the lock.
  - No scheduler needed: expiry is evaluated lazily on the next lock attempt.
  - `PUT /lock` (heartbeat) issues `UPDATE workshop_locks SET expires_at = NOW() + INTERVAL '120 seconds' WHERE workshop_id = ? AND locked_by = ?`.
- **Implications**: Simple; no `@Scheduled` bean; no Redis. Covered by Req 8.6.

### Markdown Parsing Strategy

- **Context**: H2 → phase, H3 → step; code fences preserved; base64 images extracted; external URLs preserved.
- **Findings**:
  - `commonmark-java` is a widely used, actively maintained CommonMark-compliant parser with a visitor API. Available as `org.commonmark:commonmark:0.27.x`.
  - Custom `AbstractVisitor` traverses the AST: `Heading` nodes determine phase/step boundaries; `FencedCodeBlock` nodes carry `language` and literal; `Image` nodes with `data:` URIs are extracted.
  - Base64 regex: `data:image/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)`.
  - MIME type server-side validation (Req 9.3): Apache Tika (`org.apache.tika:tika-core`) inspects file content, not filename.
- **Implications**: `MarkdownImportService` uses `commonmark-java` for AST traversal and Tika for MIME detection. Import preview is stored in `import_sessions` (in-memory `ConcurrentHashMap` with 10-min TTL is acceptable since confirm must follow the same request session within one edit session).

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Layered (Controller → Service → Repository) | Standard Spring MVC layering with clear package boundaries | Familiar; maps directly to `Result<T>` pipeline per layer; easy to test each layer in isolation | Can become anemic if service layer is trivial pass-through | Aligns with steering `backend.md` layer diagram |
| Hexagonal (Ports & Adapters) | Core domain with inbound/outbound ports; adapters for HTTP, DB, S3 | Strong boundary enforcement | Significant boilerplate for a bounded CRUD service | Overkill for this scope; adds adapter layer without domain complexity to justify it |
| CQRS | Separate read and write models | Optimised read projections | Double model maintenance; jOOQ DSL already optimises reads directly | No event sourcing in scope; unnecessary |

**Selected**: Layered — matches steering principles, jOOQ DSL, and `Result<T>` chain style.

---

## Design Decisions

### Decision: `Result<T>` Pipeline as Primary Error-Handling Contract

- **Context**: Existing infrastructure at `io.stageboard.spellbook.common.model` already provides `Result<T>` and `DomainError`.
- **Alternatives Considered**:
  1. Throw exceptions everywhere — violates non-negotiable C-02
  2. Use Kotlin `Either` (Arrow) — adds a dependency and duplicates existing infrastructure
- **Selected Approach**: All service and repository methods return `Result<T>`; `Result.catching { }` wraps all infrastructure calls; `map`/`flatMap`/`fold` chains compose operations.
- **Rationale**: Already mandated by steering; keeps error paths explicit and typed.
- **Trade-offs**: Slightly more verbose than exceptions; pipelines are easier to reason about.
- **Follow-up**: Ensure `@ControllerAdvice` handles `Result.Failure` via the `Result.toResponseEntity()` extension.

### Decision: jOOQ `DSLContext.transaction { }` for Atomic Multi-Step Writes

- **Context**: Publish, move, reorder, restore, and cascade delete all require multi-table writes in one transaction.
- **Alternatives Considered**:
  1. `@Transactional` on service methods — works but hides the transaction boundary; `Result<T>` wrapped in exception hides failures from jOOQ
  2. Explicit `DSLContext.transaction { }` — makes the boundary explicit; composes with `Result.catching { dsl.transaction { ... } }`
- **Selected Approach**: `dsl.transaction { config -> ... }` inside `Result.catching { }`.
- **Rationale**: Explicit transaction scope prevents accidental partial commits; result type propagates cleanly.
- **Trade-offs**: Slightly more ceremony than annotation-based; worth it for clarity.

### Decision: In-Memory Import Session State (ConcurrentHashMap)

- **Context**: Import preview (POST /import/markdown) must be correlated with confirm (POST /import/markdown/confirm) for the same workshop.
- **Alternatives Considered**:
  1. Persist preview to DB table — overhead for transient data; requires cleanup job
  2. `ConcurrentHashMap<workshopId, ImportPreview>` in application memory — simple; preview is invalidated after confirm or 10-min TTL via `ScheduledExecutorService`
  3. Redis — adds infrastructure dependency for a small use case
- **Selected Approach**: `ConcurrentHashMap` with 10-min TTL. Single-instance deployment assumption (workshop lock already implies single-server deployment for this phase).
- **Rationale**: No Redis dependency needed; aligns with existing stateless assumptions.
- **Trade-offs**: Not horizontally scalable without sticky sessions; acceptable for current scope.

### Decision: commonmark-java for Markdown AST Parsing

- **Context**: Need to traverse Markdown AST to extract headings, code blocks, and images.
- **Alternatives Considered**:
  1. Regex-based parsing — brittle for nested structures and edge cases
  2. `flexmark-java` — larger API surface, slower parse for this use case
  3. `commonmark-java` — minimal, fast, CommonMark-compliant, has Visitor API
- **Selected Approach**: `commonmark-java` 0.27.x.
- **Rationale**: Minimal dependency; Visitor API exactly fits the H2/H3 traversal pattern; well-maintained.

---

## Risks & Mitigations

- **OAuth callback URL (OQ-4 open)**: Production provider registration requires a fixed base URL → Mitigate by externalising `OAUTH_CALLBACK_BASE_URL` env var; design uses `${OAUTH_CALLBACK_BASE_URL}/api/auth/{provider}/callback`.
- **Import session memory leak**: `ConcurrentHashMap` grows if confirmations are never called → Mitigate with scheduled `removeIf { entry.createdAt < now - 10m }` every 5 minutes.
- **Lock heartbeat race**: Two tabs from the same user could both hold `PUT /lock` → `locked_by` stores user ID; heartbeat checks `locked_by = currentUser` so only the lock holder can extend.
- **X/Twitter OAuth2 compatibility**: X uses OAuth 2.0 with a non-standard profile endpoint → Custom `OAuth2UserService` needed; test with sandbox credentials before production registration.
- **jOOQ code generation**: Generated classes must stay in sync with DB schema → Gradle task `jooqCodegen` runs as part of the build; migration-first with Liquibase SQL changelogs.

---

## References

- Spring Security 7 OAuth2 Client — https://docs.spring.io/spring-security/reference/servlet/oauth2/
- jOOQ 3.20.x JSONB field binding — https://www.jooq.org/doc/3.20/manual/sql-building/field-expressions/jsonb/
- jOOQ Kotlin extensions (`jooq-kotlin`) — https://www.jooq.org/doc/3.20/manual/getting-started/tutorials/jooq-in-7-steps/step-7/
- jOOQ meta extensions Liquibase (`jooq-meta-extensions-liquibase`) — https://www.jooq.org/doc/3.20/manual/code-generation/codegen-liquibase/
- jOOQ codegen Maven plugin — https://www.jooq.org/doc/3.20/manual/code-generation/codegen-maven/
- AWS SDK for Java v2 S3 client — https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/java_s3_code_examples.html
- commonmark-java — https://github.com/commonmark/commonmark-java
- Apache Tika MIME detection — https://tika.apache.org/
- MinIO Java SDK compatibility — https://min.io/docs/minio/linux/developers/java/minio-java.html
- Liquibase Spring Boot Starter — https://docs.liquibase.com/tools-integrations/springboot/springboot.html
- Liquibase SQL format changelogs — https://docs.liquibase.com/concepts/changelogs/sql-format.html
