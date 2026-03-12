# Implementation Plan — backoffice-backend-api

## Task Summary

- **Total**: 10 major tasks, 25 sub-tasks
- **Requirements covered**: 1–11 (all)
- **Parallel opportunities**: Tasks 5 & 7 (after Task 4); Tasks 7 & 8 (after Tasks 5 & 6); sub-tasks 10.2 & 10.3

---

- [x] 1. Verify and validate the jOOQ code generation Maven plugin configuration
  - Confirm `jooq-codegen-maven` is bound to the `generate-sources` lifecycle phase in `pom.xml` so that Kotlin records are generated automatically on every `mvn compile` or `mvn package` — no manual step required
  - Verify the `KotlinGenerator` targets `io.stageboard.spellbook.generated` and reads from `db.changelog-master.xml` via `LiquibaseDatabase` using the `rootPath` property (no live database required at build time)
  - Confirm `target/generated-sources/jooq/` is wired as an additional Kotlin compiler source directory so the generated records are visible to hand-written code
  - Run `mise run backend:build` and confirm the build succeeds and Kotlin record classes exist for all 7 tables: `teams`, `users`, `workshops`, `phases`, `steps`, `workshop_versions`, `workshop_locks`
  - _Requirements: 11_

- [ ] 2. Build the shared infrastructure layer

- [x] 2.1 (P) Implement the Result → ResponseEntity conversion and error envelope
  - Create a `toResponseEntity()` extension on `Result<T>` that maps `Success` to `ResponseEntity.status(successStatus).body(successBody(value))` and delegates `Failure` to `DomainError.toResponseEntity()`
  - Implement `DomainError.toResponseEntity()`: `ValidationError` → 400 with `{ error, code, fields }`; `NotFoundError` → 404; `StateError` → 409 with `{ error, code } + context`; `DatabaseError`/`UnexpectedError` → 500 with no internal details; log 5xx at `ERROR` with full stack trace server-side
  - All error catching happens inside services and repositories via `Result.catching { }` — no `@ControllerAdvice` is used; controllers only call `.toResponseEntity()` on the `Result` they receive
  - File-size and MIME errors for import are detected explicitly in the service before any parsing begins, and returned as `ValidationError` with a `code` discriminator; controllers map these codes to 413/415
  - Place extension functions in `common/ext/` package
  - _Requirements: 10_

- [x] 2.2 (P) Configure Spring Security, JWT cookie handling, and CORS
  - Define the `SecurityFilterChain`: permit `/api/auth/**`; all other paths require a valid JWT in the `session` cookie
  - Implement `JwtCookieAuthenticationFilter` (`OncePerRequestFilter`): extracts cookie value, decodes with `JwtDecoder` via `Result.catching { }`, populates `SecurityContextHolder` on success; unauthenticated requests are rejected by Spring Security's `AuthenticationEntryPoint` returning 401
  - Configure `CorsConfigurationSource` using `FRONTEND_ORIGIN` env var with `allowCredentials = true` and no wildcard origins
  - Wire `JwtEncoder` and `JwtDecoder` beans backed by the `JWT_SECRET` env var using Spring's `NimbusJwtEncoder`/`NimbusJwtDecoder` (from `spring-boot-starter-oauth2-resource-server`)
  - _Requirements: 1, 10_

- [ ] 2.3 (P) Declare Spring Modulith module annotations
  - Annotate the `common` package with `@ApplicationModule(type = Type.OPEN)` via a `package-info.kt` file so its `Result<T>`, `DomainError`, and extension functions are visible to all modules without an Operations interface
  - Verify no `@SpringBootApplication` class or configuration imports `internal/` classes from any module directly
  - _Requirements: 11_

- [ ] 3. Implement authentication and session management — **`auth` module** (`auth/internal/`)

- [ ] 3.1 Implement the user repository and OAuth success handler
  - Create the `User` domain data class (id, teamId, email, name, passwordHash, oauthProvider, oauthSub)
  - Implement `UserRepository`: upsert by `(oauth_provider, oauth_sub)` for OAuth users; find by email for password login; find by id; all calls wrapped in `Result.catching { }`
  - Implement `JwtCookieSuccessHandler` (`OAuth2AuthenticationSuccessHandler`): retrieves or creates the user and a default team on first login; issues a signed JWT as an `HttpOnly; SameSite=Strict; Secure` cookie with 24 h `Max-Age`; redirects to `OAUTH_CALLBACK_BASE_URL + /backoffice/workshops`
  - Register a custom `OAuth2UserService` for the `x` provider to map its non-OIDC profile response (no `openid` scope) to a `UserPrincipal`
  - _Requirements: 1_

- [ ] 3.2 Implement the auth service and controller
  - Implement `AuthService`: `login()` verifies bcrypt hash — returns the same `ValidationError` for unknown email and wrong password to prevent enumeration; `me()` reads the authenticated principal from `SecurityContextHolder`; `logout()` clears the cookie with an expired `Max-Age=0` header
  - Implement `AuthController`: `GET /api/auth/{provider}` triggers Spring Security OAuth2 redirect (providers: `google`, `github`, `x`); `POST /api/auth/login` → 200 + cookie or 401; `GET /api/auth/me` → 200 current user; `POST /api/auth/logout` → 204
  - All results wired through `Result.toResponseEntity()`
  - _Requirements: 1_

- [ ] 4. Implement workshop CRUD with team scoping — **`design` module** (`design/internal/workshop/`)

- [ ] 4.1 Implement the workshop repository with paginated list
  - Create the `Workshop` and `WorkshopSummary` domain data classes
  - Implement `WorkshopRepository`: paginated list by `team_id` sorted by `draft_modified_at DESC` (default size 20, max 100); find by id + teamId; insert; update (sets `draft_modified_at = NOW()` and `last_editor_id`); delete
  - All jOOQ calls wrapped in `Result.catching { }`
  - _Requirements: 3, 11_

- [ ] 4.2 Implement the workshop service and controller
  - Implement `WorkshopService`: `listWorkshops`, `getWorkshop` (full aggregate with embedded phases+steps via jOOQ `fetchGroups`), `createWorkshop` (blank title → `ValidationError`), `updateWorkshop`, `deleteWorkshop` (cascade phases/steps/versions/lock in `dsl.transaction { }`)
  - `teamId` is always sourced from the authenticated principal — never from client parameters; cross-team access returns `NotFoundError`; controller re-maps explicit team mismatch to 403
  - Implement `WorkshopController`: `POST/GET /api/workshops`, `GET/PUT/DELETE /api/workshops/:id`; status codes 201 / 200 / 204
  - _Requirements: 2, 3_

- [ ] 4.3 Define the DesignOperations public interface
  - Define `DesignOperations` in the `design` module root package with the following contract: `getWorkshopContent(workshopId, teamId): Result<WorkshopDto>`, `exists(workshopId, teamId): Result<Boolean>`, and `appendContent(workshopId, phases, teamId, editorId): Result<WorkshopDto>`
  - Define the public DTOs (`WorkshopDto`, `PhaseDto`, `StepDto`, `ImportPhaseDto`, `ImportStepDto`) in the module root package — these are the only types visible to other modules
  - Implement `DesignOperationsImpl` using the `WorkshopService` already built in 4.2; the `appendContent` method depends on phase and step services (will be completed in task 6.4)
  - _Requirements: 9, 11_

- [ ] 5. (P) Implement phase management with gapless position ordering — **`design` module** (`design/internal/phase/`)

- [ ] 5.1 Implement the phase repository with batch position updates
  - Create the `Phase` domain data class
  - Implement `PhaseRepository`: `findByWorkshop` (ordered by position), `findById`, `insert` (assigns `MAX(position) + 1`), `update`, `delete`, `batchUpdatePositions` (map of id→position executed as a single jOOQ `batch()`), `countByWorkshop`, `findIdsByWorkshop`
  - Delete compacts remaining positions in the same statement: `UPDATE phases SET position = position - 1 WHERE workshop_id = ? AND position > ?`
  - _Requirements: 4, 11_

- [ ] 5.2 Implement the phase service and controller
  - Implement `PhaseService`: `createPhase` (estimatedMinutes > 0 validation), `updatePhase`, `deletePhase` (cascade steps + position compaction), `reorderPhases` (validates ordered ID list equals the full set of workshop phase IDs; returns `ValidationError` on set mismatch)
  - Implement `PhaseController`: `POST /api/workshops/:workshopId/phases`, `PUT .../phases/:phaseId`, `DELETE .../phases/:phaseId`, `PATCH .../phases/order`
  - _Requirements: 4_

- [ ] 6. Implement step management with typed content validation and atomic cross-phase moves — **`design` module** (`design/internal/step/`)

- [ ] 6.1 Implement the step content validator
  - Implement `StepContentValidator`: accepts a `StepUpdatePayload` and the persisted step type; validates poll options count (2–8), break `durationMinutes` (> 0 when present), type field mismatch; returns `Result.Failure(ValidationError)` with `fields` populated, or `Result.Success`
  - On type change, determine which fields are exclusive to the old type and mark them for clearing before the content JSONB is persisted
  - _Requirements: 6_

- [ ] 6.2 Implement the step repository with batch positions and atomic cross-phase move
  - Create the `Step` domain data class and the `StepUpdatePayload` sealed class hierarchy (`TheoryPayload`, `ExercisePayload`, `DemoPayload`, `PollPayload`, `BreakPayload`)
  - Implement `StepRepository`: `findByPhase`, `findById`, `insert`, `updateContent` (serialises JSONB), `delete` (with position compaction), `batchUpdatePositions`, `moveToPhase` (atomic: remove from source + compact + insert at target + compact target — all inside `dsl.transaction { }`)
  - _Requirements: 5, 11_

- [ ] 6.3 Implement the step service and controller
  - Implement `StepService`: `createStep`, `updateStep` (delegates to validator before persisting), `deleteStep` (position compaction), `reorderSteps` (validates full ID set for the phase), `moveStep` (validates target phase belongs to same workshop; delegates to repository transaction)
  - Implement `StepController`: `POST /api/phases/:phaseId/steps`, `PATCH .../steps/:stepId`, `DELETE .../steps/:stepId`, `PATCH .../steps/order`, `PATCH .../steps/:stepId/move`
  - _Requirements: 5, 6_

- [ ] 6.4 Complete the DesignOperations appendContent implementation
  - Implement `DesignOperationsImpl.appendContent()`: appends the provided phases and steps to a workshop draft by delegating to `PhaseService` and `StepService` inside a single transaction; the entire import preview confirm is handled through this interface method
  - This is the only method in `DesignOperations` that the `import` module calls when confirming an import
  - Verify that no class from `design/internal/` is referenced directly from the `import` module — all calls go through `DesignOperations`
  - _Requirements: 9, 11_

- [ ] 7. (P) Implement pessimistic workshop locking with TTL expiry — **`design` module** (`design/internal/lock/`)

- [ ] 7.1 Implement the lock repository and service
  - Implement `LockRepository`: `findActiveLock` (`WHERE expires_at > NOW()`), `upsertLock` (`INSERT … ON CONFLICT DO UPDATE` for expired or absent locks), `extendLock` (`UPDATE … WHERE locked_by = userId`; returns false when row not updated — caller is not holder), `deleteLock`
  - Implement `LockService`: `acquireLock` (lazy TTL check via `findActiveLock`; UPSERT on absent/expired; returns `LockAcquireResult.Held` or `Conflict` with `StateError` context); `heartbeat` (extends TTL; `StateError` if not holder); `releaseLock`
  - `StateError.context` carries `mapOf("lockedBy" to name, "lockedAt" to iso)` for conflict 409 responses
  - _Requirements: 8_

- [ ] 7.2 Implement the lock controller
  - Implement `LockController`: `POST /api/workshops/:id/lock` → 200 `{ held: true }` or 409 conflict payload; `PUT /api/workshops/:id/lock` (heartbeat) → 200 or 409; `DELETE /api/workshops/:id/lock` → 204
  - Workshop existence is checked in the service; non-existent workshop returns 404 before lock logic runs
  - `GET` on a locked workshop must still return 200 (lock does not block reads)
  - _Requirements: 8_

- [ ] 8. (P) Implement workshop versioning, publish, and restore — **`design` module** (`design/internal/version/`)

- [ ] 8.1 Implement the version repository and service
  - Implement `VersionRepository`: `insert` (stores full JSONB snapshot), `findByWorkshop` (sorted by `published_at DESC`), `findById`, `findLatestLabel`
  - Implement `VersionService`: `publish` — validates phases > 0 and all phases have steps > 0 (`ValidationError` with code `EMPTY_WORKSHOP` on failure); computes next label (null → `"1.0"`, else increment minor); serialises the full Workshop aggregate to JSONB; all writes in `dsl.transaction { }` with full rollback on any failure
  - `restore` — checks active lock; if held by a different user returns `StateError`; otherwise deep-copies snapshot phases+steps to the live tables in one transaction, sets `draft_modified_at = NOW()` and `last_editor_id = userId`
  - _Requirements: 7_

- [ ] 8.2 Implement the version controller
  - Implement `VersionController`: `POST /api/workshops/:id/publish` → 200 `WorkshopVersion`; `GET /api/workshops/:id/versions` → 200 list; `POST /api/workshops/:id/versions/:versionId/restore` → 200 `Workshop`
  - Map `ValidationError` with code `EMPTY_WORKSHOP` to HTTP 422 in the controller (override default 400)
  - _Requirements: 7_

- [ ] 9. Implement Markdown import with asset upload and two-phase preview/confirm — **`import` module** (`import/internal/`)

- [ ] 9.1 Implement the asset service for MinIO uploads
  - Configure an `S3Client` bean with `endpointOverride` (MINIO_ENDPOINT env var), path-style access forced, and credentials from `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
  - Implement `AssetService.upload()`: generates `imports/<UUID>.<ext>` object key, executes `S3Client.putObject()` wrapped in `Result.catching { }`, returns hosted URL `${MINIO_ENDPOINT}/${MINIO_BUCKET}/<key>`
  - _Requirements: 9_

- [ ] 9.2 Implement the Markdown parser and preview session store
  - Implement `MarkdownImportService.parseAndPreview()`: validate file size (> 5 MB → `ValidationError` code `FILE_TOO_LARGE`) and MIME via Apache Tika content inspection (reject non `text/markdown`/`text/plain` → code `UNSUPPORTED_MIME`); traverse the CommonMark AST mapping H2 headings to phases and H3 headings to steps (fallback: no H2 → single phase; no H3 → single Theory step); preserve fenced-code-block language tags in `codeLanguage`; extract base64 images, upload via AssetService, rewrite `data:` URIs to hosted URLs; keep external URLs unchanged
  - Store preview in a `ConcurrentHashMap<UUID, ImportSession>` keyed by workshopId with a 10-min TTL; schedule cleanup every 5 min using `@Scheduled` (enabled by `@EnableScheduling` on `StageboardApplication`)
  - Depends on 9.1
  - _Requirements: 9_

- [ ] 9.3 Implement the import confirm flow and controller
  - Implement `MarkdownImportService.confirm()`: look up stored preview by workshopId (400 if expired or absent); validate each entry in `ConfirmImportInput` against the stored preview (400 on any mismatch); call `DesignOperations.appendContent()` to append phases and steps where `action = INCLUDE` to the workshop draft — never call phase/step services directly
  - Implement `ImportController`: `POST /api/workshops/:id/import/markdown` (multipart; maps `FILE_TOO_LARGE` → 413, `UNSUPPORTED_MIME` → 415); `POST /api/workshops/:id/import/markdown/confirm` → 200 `Workshop`
  - Depends on 6.4 (DesignOperations.appendContent implemented)
  - _Requirements: 9_

- [ ] 10. Write integration tests and verify module boundaries

- [ ] 10.1 Auth and team isolation tests
  - Test OAuth mock-provider flow end-to-end: token exchange → JWT cookie set → `GET /api/auth/me` returns correct principal
  - Test email/password login: valid credentials → 200 + cookie; wrong password → 401; unknown email → same 401 body (no enumeration)
  - Test that user A cannot read, update, or delete user B's workshop (returns 403 or 404, not 200)
  - _Requirements: 1, 2_

- [ ] 10.2 (P) Workshop, phase, and step lifecycle tests
  - Test workshop create/list/get/update/delete; verify paginated list defaults to 20 and respects max 100
  - Test phase reorder with valid full ID set → 200; partial ID set → 400; delete with position compaction verified
  - Test step typed content validation: poll options at boundaries (1→400, 2→200, 8→200, 9→400); break durationMinutes ≤ 0 → 400; type mismatch → 400
  - Test cross-phase step move: position compaction in source and target phase; move to different workshop → 400
  - _Requirements: 3, 4, 5, 6_

- [ ] 10.3 (P) Lock, versioning, and import tests
  - Test lock lifecycle: acquire → heartbeat extends TTL → release; second user acquire while lock held → 409; expired lock → superseded on next acquire
  - Test publish: workshop with phases+steps → `WorkshopVersion` created; empty workshop → 422; partial DB failure → no version row created (rollback)
  - Test restore: draft updated with snapshot content; restore blocked when different user holds lock → 409
  - Test Markdown import: valid markdown → preview; confirm with included items → workshop updated; file > 5 MB → 413; non-text MIME → 415; confirm with unknown entries → 400
  - _Requirements: 7, 8, 9_

- [ ] 10.4 Verify Spring Modulith module boundaries
  - Create `@ApplicationModuleTest` boundary verification tests for `auth`, `design`, and `import` modules — each test calls `module.verify()` to confirm no `internal/` class is accessed from outside its module
  - Confirm `DesignOperations` is the sole cross-module access point used by `import` and that no `design/internal/` type appears in `import` module source
  - Run `mise run backend:test` and confirm all module boundary tests pass alongside integration tests
  - _Requirements: 11_
