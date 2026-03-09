# Product Overview

Spellbook is an interactive course companion for AI4Dev workshops — a static single-page app that guides trainers and participants through a structured, phase-based learning experience.

## Core Capabilities

- **Phase-based navigation**: Workshop content organized into numbered phases, each with ordered steps that the trainer walks through live
- **Step interaction**: Each step has a tool, action, code block, timing, and optional troubleshooting tips; participants can mark steps complete
- **Presenter mode**: Spotlight overlay and presenter-specific controls for on-screen delivery
- **Progress tracking**: Sticky progress bar, phase completion celebrations, per-phase elapsed timers
- **Keyboard-first UX**: Full keyboard shortcut system (`?` to open, arrow navigation, spotlight, copy code)
- **Notes**: Per-step collapsible notes persisted in localStorage; no server required

## Target Use Cases

- A trainer running a live AI4Dev workshop on their screen while participants follow along
- Participants tracking their own progress through exercises and noting insights
- Self-paced learners following a workshop recording with the companion app open

## Value Proposition

Single focused URL replaces juggling between Notion, slides, and a timer. Monospace aesthetic, colour-coded phases, and copyable code blocks optimized for developer workshops.

---

## Roadmap Context

The longer-term vision (see `prd.md`) is **Stageboard** — a real-time, multi-user workshop delivery platform where trainer navigation broadcasts live to participants. Spellbook is the current static companion; Stageboard adds WebSocket sync, backoffice authoring, and session management.

---
_Focus on patterns and purpose, not exhaustive feature lists_
