# Product Overview

**Stageboard** is a real-time, multi-user workshop delivery platform for AI4Dev — a monorepo with a Spring Boot/Kotlin backend and a React/Vite frontend. It replaces the static Spellbook companion with full backoffice authoring, live session delivery, and team-scoped content management.

## Core Capabilities

### Backoffice (Content Authoring)
- **Workshop management**: Create, edit, publish, and version workshops scoped to a team
- **Phase and step editing**: Drag-and-drop ordering, Markdown content editor, JSONB-backed step content
- **Import**: Parse Markdown files into workshop structure; upload assets to MinIO
- **Versioning**: Snapshot published workshops; restore from version history
- **Locking**: Pessimistic edit lock per workshop (TTL-based, lazy evaluation)

### Frontoffice (Workshop Delivery)
- **Trainer view**: Navigate phases/steps live; broadcast current position to participants
- **Participant view**: Follow trainer navigation in real time; mark steps complete; take notes
- **Progress tracking**: Per-phase elapsed timers, progress bar, completion celebrations
- **Keyboard-first UX**: Full shortcut system; spotlight overlay for presenter mode

## Target Use Cases

- A trainer running a live AI4Dev workshop; participants follow the same step in real time
- A content author building and iterating on workshop material in the backoffice
- Self-paced learners navigating a published workshop without a live trainer

## Value Proposition

One platform replaces Notion (content), slides (delivery), and a timer. Monospace aesthetic, colour-coded phases, and team-scoped authoring optimized for developer workshop delivery.

---

## Architecture Context

See `tech.md` for the full stack. See `prd.md` for the original product requirements document.

---
_Focus on patterns and purpose, not exhaustive feature lists_
