# Requirements Document

## Project Description (Input)

Backoffice Content Authoring — an admin interface enabling Content Authors and Trainers to create, edit, organise,
version, and publish workshop content (workshops, phases, and steps) for the Stageboard platform.

## Introduction

The Backoffice Content Authoring system is the single source of truth for all workshop content on the Stageboard
platform. It provides Content Authors (who may also be Trainers) with tools to build structured, phase-based workshops
composed of typed steps, manage workshop versions, collaborate within a team, and import content from external sources.
The backoffice operates independently of live session delivery; content created here is consumed by the Trainer and
Participant views at runtime.

This document covers the MVP scope (Phase 1 + Phase 2 from the PRD), scoped to: workshop/phase/step CRUD, markdown
authoring, step typing, drag-and-drop reordering, per-phase duration, workshop versioning, team-based access, and
Markdown import.

---

## Requirements

### Requirement 1: Workshop Management

**Objective:** As a Content Author, I want to create, read, update, and delete workshops, so that I can manage the full
library of available training content.

#### Acceptance Criteria

1. When a Content Author submits a valid workshop creation form with a title, the Backoffice shall persist the workshop
   and redirect the author to the workshop detail page.
2. When a Content Author opens the workshop list, the Backoffice shall display all workshops owned by their team, sorted
   by last-updated date descending.
3. When a Content Author updates the workshop title, the Backoffice shall save the change and reflect it immediately in
   the workshop list and detail views.
4. When a Content Author deletes a workshop, the Backoffice shall prompt for confirmation, and upon confirmation
   permanently remove the workshop and all its phases and steps.
5. If a Content Author attempts to create a workshop without a title, the Backoffice shall display an inline validation
   error and prevent submission.
6. The Backoffice shall display each workshop's title, version label, team, and last-updated timestamp in the workshop
   list.

---

### Requirement 2: Phase Management

**Objective:** As a Content Author, I want to create, edit, reorder, and delete phases within a workshop, so that I can
structure the workshop into logical, timed sections.

#### Acceptance Criteria

1. When a Content Author adds a phase to a workshop, the Backoffice shall append the phase to the end of the phase list
   and open the phase editor.
2. When a Content Author edits a phase title or estimated duration, the Backoffice shall persist the change on blur or
   explicit save.
3. When a Content Author drags a phase to a new position in the list, the Backoffice shall reorder the phases and
   persist the new sequence immediately.
4. When a Content Author deletes a phase, the Backoffice shall prompt for confirmation, and upon confirmation remove the
   phase and all its steps from the workshop.
5. If a Content Author enters a non-positive or non-numeric value for estimated duration, the Backoffice shall display a
   validation error and revert to the last valid value on blur.
6. The Backoffice shall display the per-phase estimated duration in minutes alongside the phase title in both the editor
   and the workshop outline view.

---

### Requirement 3: Step Management

**Objective:** As a Content Author, I want to create, edit, reorder, and delete steps within a phase, so that I can
define the atomic units of workshop delivery.

#### Acceptance Criteria

1. When a Content Author adds a step to a phase, the Backoffice shall present a step-type selector and, upon selection,
   create the step with type-specific default fields.
2. When a Content Author selects a step type, the Backoffice shall render only the fields relevant to that type (see
   Requirement 4 for field definitions per type).
3. When a Content Author drags a step to a new position within the same phase, the Backoffice shall reorder the steps
   and persist the new sequence immediately.
4. When a Content Author drags a step to a different phase, the Backoffice shall move the step to the target phase at
   the dropped position and persist the change.
5. When a Content Author deletes a step, the Backoffice shall prompt for confirmation and, upon confirmation,
   permanently remove the step.
6. The Backoffice shall display a step-type badge and truncated title for each step in the phase outline.
7. If a Content Author attempts to save a step without a title, the Backoffice shall display an inline validation error
   and prevent saving.

---

### Requirement 4: Content Authoring per Step Type

**Objective:** As a Content Author, I want type-specific editing fields for each step type, so that I can author content
correctly structured for delivery.

#### Acceptance Criteria

1. When the step type is **Theory**, the Backoffice shall provide: title, detail (Markdown), optional code block with
   language selector, and optional speaker notes (Markdown).
2. When the step type is **Exercise**, the Backoffice shall provide: title, problem statement (Markdown), solution (
   Markdown, hidden from participants until revealed), optional code block with language selector, and optional speaker
   notes (Markdown).
3. When the step type is **Live Demo**, the Backoffice shall provide: title and speaker notes (Markdown); no
   participant-facing content fields are shown.
4. When the step type is **Poll**, the Backoffice shall provide: title, question text, and a dynamic list of answer
   options (minimum 2, maximum 8); the author can add or remove options.
5. When the step type is **Break**, the Backoffice shall provide: title, duration in minutes, and an optional break
   message (plain text).
6. When a Content Author enters content in a Markdown field, the Backoffice shall render a live preview of the formatted
   output alongside the editor.
7. When a Content Author enters content in a code block field, the Backoffice shall syntax-highlight the preview using
   the selected language tag.
8. If a Content Author selects a language tag for a code block, the Backoffice shall persist the language tag alongside
   the code content and pass it to the delivery view.
9. When a Content Author adds a Poll option, the Backoffice shall append an empty input field and focus it
   automatically.
10. If a Poll step has fewer than 2 options at save time, the Backoffice shall display a validation error and prevent
    saving.

---

### Requirement 5: Workshop Versioning and Publishing

**Objective:** As a Content Author, I want to publish versioned snapshots of a workshop, so that live sessions always
use stable content while edits continue in a draft state.

#### Acceptance Criteria

1. The Backoffice shall maintain a **draft** state for every workshop where all edits are made.
2. When a Content Author publishes a workshop, the Backoffice shall create an immutable versioned snapshot with an
   auto-incremented semantic version label (e.g. `1.0`, `1.1`) and mark it as the current published version.
3. When a Content Author views the version history of a workshop, the Backoffice shall list all published versions with
   their version label, publish date, and author name.
4. When a Content Author opens a previous published version, the Backoffice shall display the content read-only and
   provide an option to restore it as the new draft.
5. While a workshop has no published version, the Backoffice shall prevent a Trainer from starting a live session from
   that workshop.
6. The Backoffice shall display the current published version label and draft-modified indicator prominently on the
   workshop detail page.
7. If a Content Author attempts to publish a workshop with no phases or with any phase containing no steps, the
   Backoffice shall display a validation warning and require explicit confirmation before proceeding.

---

### Requirement 6: Team-Based Multi-Author Access

**Objective:** As a Content Author, I want workshops to be owned by a team so that any team member can collaborate on
the same workshop content.

#### Acceptance Criteria

1. When a Content Author creates a workshop, the Backoffice shall associate it with the author's team and make it
   visible and editable to all team members.
2. While another team member has an active editing session on a workshop, the Backoffice shall display a lock notice to
   any other user attempting to edit it and allow only read-only access until the lock is released.
3. When a Content Author views the workshop list, the Backoffice shall display only workshops belonging to their team.
4. The Backoffice shall display the name of the last editor and the timestamp of the last edit on the workshop detail
   page.
5. If a user attempts to access a workshop not belonging to their team, the Backoffice shall return a 403 response and
   display an access-denied message.

---

### Requirement 7: Content Import from Markdown

**Objective:** As a Content Author, I want to import a Markdown file and have it mapped to the workshop structure, so
that I can migrate existing playbooks quickly.

#### Acceptance Criteria

1. When a Content Author uploads a Markdown file, the Backoffice shall parse it and present a mapping preview showing
   inferred phases (from H2 headings) and steps (from H3 headings and code blocks).
2. When the Content Author confirms the import, the Backoffice shall create the corresponding phases and steps in the
   current workshop draft, appending them after any existing content.
3. Where a Markdown section contains a fenced code block with a language tag, the Backoffice shall map it to the step's
   code field and preserve the language tag.
4. When a Content Author reviews the import preview, the Backoffice shall allow them to rename, merge, or skip
   individual mapped phases or steps before confirming.
5. If the uploaded file is not valid UTF-8 text or exceeds 5 MB, the Backoffice shall reject the upload and display a
   descriptive error message.
6. If the Markdown file contains no H2 headings, the Backoffice shall treat the entire document as a single phase and
   map H3 headings to steps; if no H3 headings exist, the entire content is mapped to a single Theory step.

---

### Requirement 8: Navigation and Workshop Outline

**Objective:** As a Content Author, I want a persistent workshop outline sidebar, so that I can navigate between phases
and steps without losing my editing context.

#### Acceptance Criteria

1. The Backoffice shall display a collapsible outline panel listing all phases and their steps for the active workshop.
2. When a Content Author clicks a phase or step in the outline, the Backoffice shall scroll the editor to that item and
   highlight it as active.
3. When a Content Author reorders a phase or step via drag-and-drop, the Backoffice shall update the outline panel order
   in real time.
4. The Backoffice shall show unsaved changes indicators (e.g. a dot) next to any phase or step with pending edits.
5. While the Backoffice is saving, the Backoffice shall disable navigation away from the current item and display a
   saving indicator.

---

## Non-Functional Requirements

### Performance

| NFR ID | Description                                  | Threshold                         | Priority | Source Req |
|--------|----------------------------------------------|-----------------------------------|----------|------------|
| P-01   | Initial workshop editor load time            | < 2 s on a 10 Mbps connection     | P0       | Req 1, 2   |
| P-02   | Markdown live preview render latency         | < 200 ms after keystroke debounce | P1       | Req 4      |
| P-03   | Drag-and-drop reorder persistence round-trip | < 500 ms                          | P1       | Req 2, 3   |

### Security

| NFR ID | Description                                           | Threshold                                                  | Priority | Source Req |
|--------|-------------------------------------------------------|------------------------------------------------------------|----------|------------|
| S-01   | All backoffice routes require authentication (OAuth2/OIDC: Google, X, GitHub; or email + password) | 100% — unauthenticated requests redirect to login | P0 | Req 6 |
| S-02   | Team isolation — cross-team data access is prohibited | 0 cross-team data leaks; enforced server-side              | P0       | Req 6      |
| S-03   | Markdown is sanitised before preview rendering        | No XSS possible via crafted Markdown input                 | P0       | Req 4      |
| S-04   | File upload validation                                | MIME type + size checked server-side, not only client-side | P0       | Req 7      |

### Scalability

| NFR ID | Description            | Threshold                                                                         | Priority | Source Req |
|--------|------------------------|-----------------------------------------------------------------------------------|----------|------------|
| SC-01  | Workshop library size  | Editor remains responsive with up to 200 workshops per team                       | P1       | Req 1      |
| SC-02  | Workshop content depth | Editor handles workshops with up to 20 phases × 30 steps each without degradation | P1       | Req 2, 3   |

### Reliability

| NFR ID | Description       | Threshold                                                                   | Priority | Source Req |
|--------|-------------------|-----------------------------------------------------------------------------|----------|------------|
| R-01   | Auto-save draft   | Unsaved content is auto-saved every 30 s; loss window ≤ 30 s                | P0       | Req 3, 4   |
| R-02   | Publish atomicity | Publishing either completes fully or rolls back; no partial version created | P0       | Req 5      |

### Usability

| NFR ID | Description            | Threshold                                                                          | Priority | Source Req |
|--------|------------------------|------------------------------------------------------------------------------------|----------|------------|
| U-01   | Keyboard accessibility | All primary CRUD and navigation actions reachable via keyboard                     | P1       | Req 1–8    |
| U-02   | Browser compatibility  | Latest Chrome, Firefox, Safari on macOS/Windows                                    | P1       | All        |
| U-03   | Monospace aesthetic    | UI consistent with Spellbook: dark background, JetBrains Mono, colour-coded phases | P1       | All        |

### Constraints

| NFR ID | Description      | Threshold                                                                    | Priority | Source Req |
|--------|------------------|------------------------------------------------------------------------------|----------|------------|
| C-01   | Frontend stack   | React + TypeScript + Vite + Tailwind v4 — no deviations                      | P0       | All        |
| C-02   | No inline styles | Tailwind utility classes only; `style={{}}` only for dynamic computed values | P0       | All        |
| C-03   | Notion import    | Out of scope for MVP (Phase 3); no stubs or placeholder UI in Phase 1/2      | P2       | —          |

---

## Open Questions

| # | Question                                                                                                                     | Impact                          | Owner          | Status   | Decision                                                                                                        |
|---|------------------------------------------------------------------------------------------------------------------------------|---------------------------------|----------------|----------|-----------------------------------------------------------------------------------------------------------------|
| 1 | What is the hosting model (SaaS vs self-hosted)? Determines auth strategy (Keycloak, Auth0, or custom).                      | Auth implementation, Req 6      | Product        | Resolved | SaaS. OAuth via Google, X (Twitter), and GitHub; also classic email + password. Standard OAuth2/OIDC flow.      |
| 2 | Should concurrent editing show live cursors / presence indicators, or last-write-wins with no conflict UI?                   | Req 6 implementation complexity | Product / Tech | Resolved | No concurrent editing. Only one editor at a time; concurrent sessions on the same workshop are not supported.   |
| 3 | What is the version label scheme — auto-incremented (1.0, 1.1) or author-defined (e.g. "Spring 2026")?                       | Req 5 UX and validation rules   | Product        | Resolved | Both: auto-incremented numeric version (1.0, 1.1, …) plus an optional user-defined tag (e.g. "Spring 2026").   |
| 4 | Is there a role distinction between "Content Author" and "Trainer" in the backoffice, or are they the same permission level? | Req 6 access control model      | Product        | Resolved | Same person / same permission level. No role split in v1.                                                       |
| 5 | Should the Markdown import support images (embedded base64 or external URLs)?                                                | Req 7 parsing scope and storage | Tech           | Resolved | Yes — support both embedded base64 images and external URL references in imported Markdown.                     |
| 6 | What is the backend API technology (REST vs GraphQL)? Affects client data-fetching patterns.                                 | Design phase                    | Tech           | Resolved | REST API.                                                                                                       |

---

## Decision Log

The following decisions refine the requirements above and must be reflected in the design:

- **Auth (Req 6, S-01):** SaaS deployment with OAuth2/OIDC login via Google, X, and GitHub, plus email + password. No Keycloak or self-hosted IdP.
- **Concurrency (Req 6, AC-2):** No concurrent editing. The Backoffice shall detect when another user has an active editing session on the same workshop and display a lock notice; the second user may view the workshop read-only until the lock is released.
- **Versioning (Req 5, AC-2):** Each published version has an auto-incremented label (e.g. `1.0`, `1.1`) and an optional author-defined tag string (e.g. "Spring 2026"). Both are stored and displayed in version history.
- **Role model:** A single authenticated user role; "Content Author" and "Trainer" are the same account. Admin role (team/account management) is a separate elevated permission but not in scope for this spec.
- **Markdown image import (Req 7):** Importer shall handle `![alt](data:image/…;base64,…)` (inline base64) by uploading the image to the platform's asset store and rewriting the URL; external URLs (e.g. `![alt](https://…)`) are preserved as-is.
- **API:** REST. The frontend communicates with the backend via JSON REST endpoints. No GraphQL.
