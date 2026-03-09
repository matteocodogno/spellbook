# PRD — Workshop Delivery Platform

**Working name:** Stageboard
**Version:** 0.1 — Discovery
**Date:** 2026-03-09
**Author:** Product Discovery (AI4Dev)

---

## 1. Problem Statement

Running a technical workshop today requires juggling 4+ disconnected tools simultaneously: a playbook in Notion, slides
in Keynote, code in an IDE, and a phone timer. The result is predictable: slides drift out of sync with exercises,
participants lose their place, the trainer loses track of time, and context-switching kills the delivery flow.

There is no single tool designed for the full workshop delivery experience — one that keeps the trainer, the content,
and every participant's screen in lockstep.

---

## 2. Vision

A web-based workshop delivery platform where a trainer opens one URL, participants open one URL, and everything —
content, timing, exercises, and progress — stays in sync in real time. Content is authored once in a backoffice,
delivered everywhere.

---

## 3. Users & Roles

| Role               | Description                                                                                                                                     |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| **Trainer**        | Drives the session. Controls navigation, reveals solutions, manages timer. Has speaker notes and a progress mini-map invisible to participants. |
| **Participant**    | Follows the session on their own laptop. View auto-advances with the trainer. Can take notes tied to specific steps.                            |
| **Content Author** | Creates and maintains workshop content via the backoffice. May overlap with Trainer.                                                            |
| **Admin**          | Manages trainer accounts and workshop library.                                                                                                  |

---

## 4. Core Concepts

### 4.1 Workshop

A named, versioned collection of **phases**. A workshop can be run as a **session** (a live instance with connected
participants).

### 4.2 Phase

A top-level section of a workshop (e.g. "CONNECT", "PART 1 — Prompt Anatomy"). Has a title, estimated duration, and an
ordered list of **steps**.

### 4.3 Step

The atomic unit of delivery. Every step has a **type** that determines its layout and behaviour:

| Type          | Trainer controls                       | Participant sees                                  |
|---------------|----------------------------------------|---------------------------------------------------|
| **Theory**    | Concept text + code block              | Same, read-only                                   |
| **Exercise**  | Problem + solution (hidden by default) | Problem only; solution revealed on trainer action |
| **Live Demo** | Speaker note: "switch to IDE"          | Focused waiting screen with step title            |
| **Poll**      | Question + options; can reveal results | Question + options; submits answer                |
| **Break**     | Duration + optional message            | Countdown timer + message                         |

### 4.4 Session

A live run of a workshop. The trainer starts a session → gets a **session code** → participants join via URL + code. The
trainer's navigation is broadcast to all participants via WebSocket. Sessions are recorded (step timestamps, poll
responses) for post-session analytics.

---

## 5. Feature Requirements

### 5.1 Backoffice — Content Authoring

- CRUD for workshops, phases, and steps
- Markdown editor for all text fields (detail, code, problem, solution, speaker notes)
- Code block with language tag (syntax highlighting in delivery view)
- Step type selector with type-specific fields
- Drag-and-drop reordering of phases and steps within a phase
- Per-phase estimated duration (shown to trainer as target)
- Workshop versioning — ability to publish a version and keep previous ones accessible
- Multi-trainer access: workshops are owned by a team, any team member can edit
- Import from Markdown file (map headings to phases, code blocks to steps)
- Import from Notion page (via Notion API, map to same structure)

### 5.2 Trainer View

- Full-screen delivery mode
- **Navigation controls:** previous / next step, jump to any step via mini-map
- **Mini-map panel:** all phases and steps visible, current position highlighted, completed steps marked
- **Timer panel** (always visible):
    - Per-phase countdown based on estimated duration
    - Global elapsed session time
    - Visual warning when over estimate (amber → red)
    - Manual override: pause, reset, extend
- **Speaker notes** panel (hidden from participants)
- **Solution reveal button** on Exercise steps (one-click, broadcasts to participants)
- **Poll dashboard** on Poll steps: live response count + distribution chart
- **Participant count** indicator (how many are connected)
- Keyboard shortcuts: `→` / `←` navigate, `s` reveal solution, `t` toggle timer, `n` toggle notes

### 5.3 Participant View

- Joins via URL + session code (no account required)
- Auto-advances when trainer navigates — no manual action needed
- **Current step display:** step type badge, title, content, code block (copyable)
- **Exercise steps:** problem visible immediately; solution appears only after trainer reveals it
- **Timer:** same countdown the trainer sees, always visible
- **Notes:** collapsible textarea per step, persisted in localStorage
- **Poll steps:** answer submission UI; results shown after trainer reveals
- **Break steps:** full-screen countdown + optional break message
- **Disconnect/reconnect:** if participant loses connection, they rejoin at the trainer's current step

### 5.4 Real-time Sync

- WebSocket server (one connection per session)
- Trainer actions broadcast as events: `NAVIGATE`, `REVEAL_SOLUTION`, `START_TIMER`, `PAUSE_TIMER`, `OPEN_POLL`,
  `CLOSE_POLL`, `REVEAL_RESULTS`
- Participants receive events and update their view immediately
- New joiners receive current session state snapshot on connect (catch-up)
- Session state persisted server-side (trainer can reload without losing state)

### 5.5 Session Management

- Trainer starts session from the backoffice workshop page
- Session generates a short code (e.g. `AI4DEV-42`) and a participant URL
- Session dashboard: connected participants list, current step, elapsed time
- Session history: list of past sessions per workshop with timestamps
- Post-session export: step-by-step timeline, poll results, participant note count

---

## 6. Non-Functional Requirements

| Category               | Requirement                                                                                     |
|------------------------|-------------------------------------------------------------------------------------------------|
| **Latency**            | WebSocket event delivery < 200ms p99 for sessions up to 50 participants                         |
| **Availability**       | 99.5% uptime during business hours (workshop delivery is time-critical)                         |
| **Scalability**        | Support 50 concurrent participants per session; 20 concurrent sessions                          |
| **Security**           | Session codes expire after 24h; trainer auth via email + password or SSO                        |
| **Compatibility**      | Participant view: latest Chrome, Firefox, Safari on macOS/Windows                               |
| **Offline resilience** | Participant can view last-received step if connection drops; auto-reconnects                    |
| **Data privacy**       | Participant notes never leave the browser (localStorage only); no participant accounts required |

---

## 7. Content Data Model (draft)

```typescript
type StepType = "theory" | "exercise" | "demo" | "poll" | "break";

interface Workshop {
  id: string;
  title: string;
  version: string;
  team: string;
  phases: Phase[];
}

interface Phase {
  id: string;
  title: string;
  estimatedMinutes: number;
  steps: Step[];
}

interface Step {
  id: string;
  type: StepType;
  icon: string;
  title: string;
  // Theory + Exercise + Demo
  detail?: string;       // markdown
  code?: string;         // markdown code block
  speakerNotes?: string; // markdown, trainer only
  // Exercise only
  problem?: string;      // markdown
  solution?: string;     // markdown, hidden until revealed
  // Poll only
  question?: string;
  options?: string[];
  // Break only
  durationMinutes?: number;
  message?: string;
}
```

---

## 8. UX Principles

- **Trainer focus:** the trainer's screen must never require more than one click to advance or reveal — cognitive load
  during live delivery must be near zero
- **Participant clarity:** participants always know where they are, what to do, and how much time is left — no ambiguity
- **Content authority:** the backoffice is the single source of truth — no content lives in the delivery app itself
- **Monospace aesthetic:** consistent with spellbook — dark background, monospace font, colour-coded phases, code blocks
  with copy

---

## 9. Out of Scope (v1)

- Video/audio streaming
- Screen sharing built into the platform (trainers use Zoom/Meet for that)
- Participant accounts and persistent profiles
- Mobile participant view (desktop browser only for v1)
- AI-assisted content generation in the backoffice
- LMS integration (SCORM, xAPI)
- Async / self-paced mode

---

## 10. Open Questions

| #    | Question                                                                        | Impact                     | Owner   |
|------|---------------------------------------------------------------------------------|----------------------------|---------|
| OQ-1 | What is the hosting model? Self-hosted per team or SaaS?                        | Auth model, pricing, infra | Product |
| OQ-2 | Should the session code be shareable (open join) or invite-only?                | Security, UX               | Product |
| OQ-3 | What is the import fidelity target for Notion pages? Best-effort or guaranteed? | Backoffice scope           | Tech    |
| OQ-4 | Should poll responses be anonymous?                                             | Privacy, UX                | Product |
| OQ-5 | Is a participant name/alias required on join, or fully anonymous?               | Analytics, UX              | Product |
| OQ-6 | What stack for the WebSocket server? (Node + Socket.io, Elixir/Phoenix, etc.)   | Tech                       | Tech    |

---

## 11. Proposed Stack (suggestion)

| Layer                            | Choice                                  | Rationale                                    |
|----------------------------------|-----------------------------------------|----------------------------------------------|
| Frontend (delivery + backoffice) | React + TypeScript + Vite + Tailwind v4 | Consistent with spellbook                    |
| Real-time                        | Socket.io (Node) or Liveblocks          | Fast to integrate, scales to 50 participants |
| Backend API                      | Spring Boot / Kotlin                    | Consistent with AI4Dev stack                 |
| Database                         | PostgreSQL                              | Workshop content + session history           |
| Auth                             | Keycloak or Auth0                       | Multi-trainer SSO support                    |
| Toolchain                        | mise + pnpm                             | Consistent with spellbook project            |

---

## 12. MVP Scope (suggested)

Phase 1 — **Core delivery loop:**

- Backoffice: create workshop → phases → steps (Theory + Exercise only)
- Trainer view: navigate steps, reveal solutions, basic timer
- Participant view: auto-sync, step display, notes
- WebSocket sync: NAVIGATE + REVEAL_SOLUTION events only

Phase 2 — **Live session features:**

- Poll step type + live results
- Break step type with countdown
- Mini-map + session analytics
- Import from Markdown

Phase 3 — **Scale + polish:**

- Notion import
- Workshop versioning
- Post-session export
- Multi-team / admin panel