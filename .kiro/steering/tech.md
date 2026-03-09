# Technology Stack

## Architecture

Static SPA — no backend, no router. All state is in-memory (React context) or persisted to `localStorage`. Deployed as a `dist/` static bundle.

## Core Technologies

- **Language**: TypeScript 5.9 (strict mode)
- **Framework**: React 19 (functional components only)
- **Bundler**: Vite 7 with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config.js`
- **Runtime**: Node 22, managed by mise

## Key Libraries

- No routing library — single page, no routes
- No state management library — React context only
- No CSS-in-JS — Tailwind utility classes exclusively; `style={{}}` only for truly dynamic computed values (e.g. phase colours read from data)

## Development Standards

### Type Safety
- TypeScript strict mode: no `any`, no `@ts-ignore` without an explanatory comment
- Props interfaces defined inline above the component they belong to
- Shared types (used across 3+ components) live in `src/data/` alongside the data they describe

### Code Quality
- ESLint 9 with `typescript-eslint` and `eslint-plugin-react-hooks`
- Zero lint errors required before commit

### Styling
- Tailwind utility classes only
- Colours defined in `@theme` block in `index.css` — never hardcode hex values in components
- Phase palette defined once in `src/data/palette.ts`

## Development Environment

### Required Tools
All tools managed via mise — never invoke `node`, `pnpm`, or `npx` directly without `mise exec --`.

```bash
# Dev:       mise run dev          → http://localhost:5173
# Build:     mise run build        → dist/
# Typecheck: mise run typecheck    → tsc --noEmit
# Lint:      mise run lint         → eslint
# Preview:   mise run preview
```

## Key Technical Decisions

- **No router**: This is intentionally a single-view app; adding a router would introduce unnecessary complexity
- **No CSS-in-JS**: Tailwind v4 Vite plugin gives instant utility classes without a runtime; consistent with the monospace developer aesthetic
- **Contexts over global state**: `WorkflowContext` and `NotesContext` provide the two main state domains; no Redux/Zustand
- **Fonts**: JetBrains Mono as primary UI font, loaded globally

---
_Document standards and patterns, not every dependency_
