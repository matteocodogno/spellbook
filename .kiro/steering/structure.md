# Project Structure

## Organization Philosophy

Feature-thin, concern-layered. Code is split by what it is (component, hook, data, context, util), not by feature. Works well because the app has a single view with a shared data model.

## Directory Patterns

### Components (`src/components/`)
**Purpose**: React UI components — one component per file, no business logic
**Naming**: PascalCase (`PhaseCard.tsx`, `CodeBlock.tsx`)
**Rule**: Props interface defined inline above the component; no default exports (except page-level and `App.tsx`)

### Data (`src/data/`)
**Purpose**: All content and configuration — phases, steps, palette, prerequisites, comm-flow diagrams
**Rule**: Data lives here, never inlined in components. Shared TypeScript interfaces co-located with the data they describe (e.g. `Phase`, `Step` types in `phases.ts`)

### Hooks (`src/hooks/`)
**Purpose**: Reusable stateful logic extracted from components
**Examples**: `useWorkflow.tsx` (step/phase state machine), `usePhaseTimers.ts` (elapsed time), `useKeyboardShortcuts.ts`, `useNotes.tsx`

### Contexts (`src/contexts/`)
**Purpose**: React context providers for cross-component state
**Examples**: `WorkflowContext.tsx` (active phase, completed steps, focused step), `NotesContext.tsx` (per-step notes)

### Utils (`src/utils/`)
**Purpose**: Pure utility functions with no React dependency
**Example**: `copyText.ts` (clipboard helper)

## Naming Conventions

- **Files**: PascalCase for components (`PhaseCard.tsx`), camelCase for hooks/utils/data (`useScrolled.ts`, `palette.ts`)
- **Components**: Named exports preferred; default export only for `App.tsx` and page-level components
- **Hooks**: Prefix `use` (`useWorkflow`, `useConfetti`)
- **Contexts**: Suffix `Context` (`WorkflowContext`, `NotesContext`)

## Import Organization

```typescript
// React and third-party first
import { useState } from "react";

// Internal data
import { phases } from "./data/phases";

// Hooks
import { useWorkflow } from "./hooks/useWorkflow";

// Contexts
import { WorkflowProvider } from "./contexts/WorkflowContext";

// Components (alphabetical within group)
import { Header } from "./components/Header";
import { PhaseList } from "./components/PhaseList";
```

No path aliases configured — use relative imports from `src/`.

## Code Organization Principles

- Types shared across 3+ components move to `src/data/`; otherwise they stay inline above the component
- `App.tsx` is the composition root — it wires providers and top-level layout; it should not contain feature logic
- Phase colour palette is the single source of truth in `src/data/palette.ts` — phase components read from it, never define their own colours

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
