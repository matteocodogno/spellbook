# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

---

## Summary

- **Feature**: `backoffice-content-authoring`
- **Discovery Scope**: New Feature — the backoffice is a greenfield SPA, distinct from the existing Spellbook static app. Full discovery executed.
- **Key Findings**:
  - The existing Spellbook app is explicitly no-router / no-backend; the backoffice cannot be embedded in it without violating project constraints. A separate Vite application in a pnpm workspace monorepo is the correct architectural boundary.
  - `@dnd-kit` (core + sortable) is the de-facto accessible drag-and-drop library for React; it works out-of-the-box with Vite and does not require additional peer dependencies.
  - TanStack Query v5 paired with a typed `fetch` wrapper covers all server-state needs (loading, caching, mutation, optimistic updates) without introducing a heavy global store.
  - Pessimistic locking (server-side TTL + heartbeat) is simpler and sufficient for a team-scoped backoffice with low concurrent-edit likelihood; collaborative OT/CRDT would be over-engineering.
  - OAuth flows (Google, GitHub, X) should be handled server-side (redirect dance) to keep tokens out of the browser. The frontend only renders login UI and follows redirects.

---

## Research Log

### Drag-and-Drop Library Selection

- **Context**: Requirements 2 and 3 need phase and step reordering via drag-and-drop.
- **Sources Consulted**: @dnd-kit GitHub, react-beautiful-dnd (archived), pragmatic-drag-and-drop (Atlassian)
- **Findings**:
  - `react-beautiful-dnd` is archived and no longer maintained.
  - `@dnd-kit/core` v6 + `@dnd-kit/sortable` v8 are the current standard; actively maintained, accessibility-first, no jQuery or DOM manipulation.
  - `pragmatic-drag-and-drop` (Atlassian) is newer but less community adoption.
  - @dnd-kit supports cross-list dragging (step moves between phases) via `DndContext` with multiple `SortableContext` containers.
- **Implications**: Use `@dnd-kit/core` + `@dnd-kit/sortable`. Cross-phase step drag requires a shared parent `DndContext`.

### Markdown Editor Stack

- **Context**: Requirement 4 demands a Markdown editor with live preview, syntax highlighting on code blocks, debounced preview (< 200 ms).
- **Sources Consulted**: CodeMirror 6 docs, @uiw/react-codemirror, @milkdown/react, react-markdown, remark-gfm, rehype-highlight
- **Findings**:
  - CodeMirror 6 (`@uiw/react-codemirror` + `@codemirror/lang-markdown`) is headless, treeshake-friendly, and works in Vite without extra config.
  - `@milkdown/react` adds WYSIWYG but couples authoring to a proprietary AST; harder to round-trip to plain Markdown.
  - Split-pane (editor left, preview right) is simpler to implement and aligns with the monospace developer aesthetic of Spellbook.
  - `react-markdown` + `remark-gfm` + `rehype-highlight` gives GFM support and code block syntax highlighting in preview without heavy bundling.
  - Debounce of 300 ms on the `onChange` handler before updating preview keeps preview latency well under the 200 ms NFR threshold.
- **Implications**: Use `@uiw/react-codemirror` for the editor pane and `react-markdown` + `remark-gfm` + `rehype-highlight` for the live preview pane.

### Server State Management

- **Context**: CRUD operations on workshops/phases/steps need loading states, cache invalidation, optimistic updates, and auto-save (30 s debounce).
- **Sources Consulted**: TanStack Query v5 docs, SWR docs
- **Findings**:
  - TanStack Query v5 provides `useQuery`, `useMutation`, and `queryClient.invalidateQueries` covering all needs.
  - Auto-save via a debounced `useMutation` + `onSuccess` cache invalidation is straightforward.
  - SWR is simpler but lacks mutation lifecycle hooks needed for optimistic UI.
  - CLAUDE.md prohibits global state libraries for the *existing* Spellbook app; the backoffice is a new application and this constraint does not apply, but TanStack Query is still a minimal addition (server-state only, not a Redux replacement).
- **Implications**: Use TanStack Query v5. Local editor draft state (fields not yet auto-saved) lives in `useState` within the `StepEditorCard` component.

### Routing

- **Context**: The backoffice needs multiple pages (list, editor, version history, login). Spellbook prohibits adding a router, but this is a separate app.
- **Sources Consulted**: TanStack Router v1 docs, React Router v7 docs
- **Findings**:
  - TanStack Router v1 is fully type-safe (route params, search params, loader data), file-based optional, SPA-compatible with Vite.
  - React Router v7 in "data mode" (no server framework) is also valid; less type-safety on route params.
  - TanStack Router aligns well with TanStack Query (shared ecosystem, devtools).
- **Implications**: Use TanStack Router v1 for the backoffice SPA.

### OAuth & Authentication

- **Context**: Requirement 6 + OQ-1 decision: SaaS with OAuth (Google, X, GitHub) + email/password.
- **Sources Consulted**: OAuth 2.0 RFC, PKCE for SPAs, httpOnly cookie patterns
- **Findings**:
  - PKCE-in-SPA exposes the access token in `localStorage` or `sessionStorage`, making XSS attacks higher-impact.
  - Backend-handled OAuth redirect flow (frontend sends user to `/api/auth/google`, backend completes the dance, sets httpOnly cookie containing JWT) keeps tokens off the client entirely.
  - The frontend only needs: a login page with OAuth buttons, a `POST /api/auth/login` endpoint for email/password, and a `POST /api/auth/logout`.
  - Token refresh can be handled transparently server-side (httpOnly refresh cookie).
- **Implications**: No OAuth client library needed on the frontend. Auth state is derived from `GET /api/auth/me` (returns current user or 401). The `apiClient` wraps all requests with credentials (`credentials: "include"` for cookie-based auth).

### Pessimistic Locking Strategy

- **Context**: OQ-2 decision: no concurrent editing. Need a locking mechanism.
- **Sources Consulted**: Optimistic vs pessimistic locking patterns, Notion/Figma concurrency models
- **Findings**:
  - Pessimistic lock = server-side record (`workshop_locks` table: `workshop_id`, `locked_by`, `locked_at`, `expires_at`).
  - TTL of 120 s with client heartbeat every 60 s prevents stale locks.
  - On tab close / navigate: `beforeunload` fires `DELETE /workshops/:id/lock` (best-effort; TTL handles failures).
  - Lock acquisition: `POST /workshops/:id/lock` → 200 (acquired) | 409 (conflict + `lockedBy` name).
- **Implications**: `LockService` hook manages acquire, heartbeat, release lifecycle. `LockBanner` displays conflict notice with editor name.

### Monorepo vs Standalone App

- **Context**: The backoffice is a new SPA sharing the same tech stack but needing separate routing, auth, and build entry point.
- **Findings**:
  - Embedding in existing Spellbook requires adding a router, violating CLAUDE.md.
  - pnpm workspaces monorepo (`apps/spellbook` + `apps/backoffice` + optional `packages/shared`) is the standard pattern for this scenario.
  - Shared TypeScript types (Workshop, Phase, Step) can live in `packages/shared-types` and be imported by both apps.
- **Implications**: Recommend converting to pnpm workspace monorepo. This is the only design option that respects existing constraints.

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| **pnpm Workspace Monorepo** (selected) | `apps/spellbook` + `apps/backoffice` as separate Vite apps; shared types in `packages/shared-types` | Respects Spellbook constraints; shared types; single repo CI | Requires monorepo migration (one-time cost); adds workspace config | Recommended |
| Embed in Spellbook SPA | Add router + backoffice views to the existing app | Zero migration cost | Violates CLAUDE.md (no router); bundles authoring code into delivery SPA; breaks separation of concerns | Rejected |
| Standalone separate repo | Brand new repository for the backoffice | Maximum isolation | Duplicates tooling setup; no shared types; harder to keep in sync | Rejected for MVP |

---

## Design Decisions

### Decision: `pnpm Workspace Monorepo Layout`
- **Context**: Backoffice needs routing, auth, and API integration that conflict with Spellbook's constraints.
- **Alternatives Considered**:
  1. Embed in Spellbook SPA — rejected (breaks CLAUDE.md no-router constraint)
  2. Standalone repo — rejected (duplicates tooling, harder type-sharing)
- **Selected Approach**: Convert repo to pnpm workspaces with `apps/spellbook`, `apps/backoffice`, `packages/shared-types`.
- **Rationale**: Preserves Spellbook's intentional simplicity; allows the backoffice to have its own dependencies (router, auth, query); shared types prevent model drift.
- **Trade-offs**: One-time repo migration; CI must build both apps separately.
- **Follow-up**: Create `pnpm-workspace.yaml`; add workspace `tsconfig.json`; migrate existing Spellbook to `apps/spellbook`.

### Decision: `TanStack Query v5 for Server State`
- **Context**: Multiple resource types (workshops, phases, steps, versions, locks) each need caching, loading states, and mutation.
- **Alternatives Considered**:
  1. SWR — simpler but mutation lifecycle is limited
  2. Redux Toolkit Query — heavier, not needed without existing Redux store
- **Selected Approach**: TanStack Query v5 with a `QueryClientProvider` at app root.
- **Rationale**: Minimal API surface; excellent devtools; first-class integration with TanStack Router loaders.
- **Trade-offs**: New dependency (140 kB gzipped), but it eliminates dozens of bespoke fetch/loading/error state patterns.

### Decision: `CodeMirror 6 + react-markdown for Markdown Fields`
- **Context**: Req 4 needs Markdown editing with < 200 ms live preview.
- **Alternatives Considered**:
  1. @milkdown/react WYSIWYG — opinionated AST, not plain Markdown
  2. Simple `<textarea>` + preview — no syntax highlighting in editor
- **Selected Approach**: `@uiw/react-codemirror` for editing pane; `react-markdown` + `remark-gfm` + `rehype-highlight` for preview pane.
- **Rationale**: Raw Markdown storage; editor highlighting improves author UX; preview is faithful to delivery view rendering.
- **Trade-offs**: Two separate rendering stacks to maintain; preview must use same remark/rehype plugins as delivery view.

### Decision: `Backend-Handled OAuth (httpOnly Cookies)`
- **Context**: Auth via Google, X, GitHub + email/password. Security NFR S-01/S-03.
- **Alternatives Considered**:
  1. PKCE SPA flow — tokens in localStorage; XSS risk
  2. Third-party auth service (Auth0, Clerk) — faster to integrate, adds vendor lock-in and cost
- **Selected Approach**: Backend redirect-based OAuth; JWT in httpOnly cookie; `GET /api/auth/me` for auth state.
- **Rationale**: Eliminates client-side token exposure; simpler frontend (no OAuth library); works with any backend auth implementation.
- **Trade-offs**: Frontend cannot decode token (no direct JWT access); must call `/api/auth/me` on app load.

---

## Risks & Mitigations

- **Lock TTL race**: User loses lock mid-edit if heartbeat fails (network blip). Mitigation: on 409 heartbeat response, show "Lock lost" modal and trigger auto-save before blocking further edits.
- **Markdown import fidelity**: H2/H3 heading mapping may not match all playbook structures. Mitigation: always show mapping preview before commit; allow rename/skip.
- **Base64 image size**: A single inline image can exceed the 5 MB upload limit. Mitigation: reject at file-size check before sending to server; display per-image size in import preview.
- **Monorepo migration**: Existing CI/CD pipelines may break during `apps/spellbook` migration. Mitigation: keep root `package.json` scripts forwarding to workspaces; update CI in same PR.
- **remark/rehype version drift**: Preview plugins must match delivery view rendering. Mitigation: extract shared remark/rehype config to `packages/shared-types/src/markdown.ts`.

---

## References

- @dnd-kit documentation — drag-and-drop, sortable, cross-list drag
- TanStack Query v5 — server state, mutations, cache invalidation
- TanStack Router v1 — type-safe routing, SPA mode with Vite
- @uiw/react-codemirror — CodeMirror 6 React wrapper
- react-markdown + remark-gfm — Markdown rendering
- rehype-highlight — syntax highlighting in preview
- OAuth 2.0 RFC 6749 + PKCE RFC 7636 — auth patterns
- PRD — `.kiro/steering/prd.md`
- Requirements — `.kiro/specs/backoffice-content-authoring/requirements.md`
