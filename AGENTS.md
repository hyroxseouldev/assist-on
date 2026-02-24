# AGENTS.md

This guide is for coding agents working in this repository.
Follow these conventions unless the user asks otherwise.

## Project Overview

- Stack: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4.
- UI system: shadcn-based components in `src/components/ui`.
- Package manager: `pnpm` (lockfile is `pnpm-lock.yaml`).
- Linting: ESLint 9 with `eslint-config-next` (core-web-vitals + TypeScript).
- TypeScript mode: strict (`"strict": true` in `tsconfig.json`).

## Repository Layout

- `src/app/*`: App Router entrypoints (`layout.tsx`, `page.tsx`, global CSS).
- `src/components/ui/*`: reusable UI primitives (mostly shadcn patterns).
- `src/hooks/*`: React hooks (example: `use-mobile.ts`).
- `src/lib/*`: shared utilities (example: `cn` in `utils.ts`).
- `public/*`: static assets.
- `components.json`: shadcn component generator config.

## Cursor / Copilot Rules

- No `.cursor/rules/` directory found.
- No `.cursorrules` file found.
- No `.github/copilot-instructions.md` file found.
- If these files are added later, treat them as high-priority repo rules and update this document.

## Setup Commands

- Install deps: `pnpm install`
- Start dev server: `pnpm dev`
- Build production app: `pnpm build`
- Start production server: `pnpm start`
- Run linter: `pnpm lint`

## Build / Lint / Test Commands

### Build

- Full build: `pnpm build`
- Recommended pre-PR verification: `pnpm lint && pnpm build`

### Lint

- Lint entire repo: `pnpm lint`
- Lint specific files: `pnpm lint src/app/page.tsx src/components/ui/button.tsx`
- Alternative direct ESLint call: `pnpm exec eslint src --max-warnings=0`

### Type Checking

- No explicit `typecheck` script exists.
- Run typecheck directly: `pnpm exec tsc --noEmit`

### Tests (Current State)

- There is currently no configured test runner and no test script in `package.json`.
- There are currently no `*.test.*` or `*.spec.*` files in this repo.

### Single Test Guidance

- Since no test framework is installed yet, there is no runnable single-test command today.
- If tests are introduced, add a `test` script and document single-test commands here.
- Typical future patterns (framework-dependent examples):
  - Vitest file: `pnpm test -- src/foo/bar.test.ts`
  - Vitest by name: `pnpm test -- -t "renders submit button"`
  - Jest file: `pnpm test -- src/foo/bar.test.ts`
  - Playwright single spec: `pnpm exec playwright test tests/auth.spec.ts`

## Code Style and Conventions

## Language and Types

- Use TypeScript for all new source files (`.ts` / `.tsx`).
- Respect strict typing; avoid `any` unless unavoidable and localized.
- Prefer explicit domain types for component props and function contracts.
- Use `import type` for type-only imports when practical.

## Imports

- Prefer alias imports from `@/*` for internal modules (configured in `tsconfig.json`).
- Keep import groups readable:
  1) framework/external packages,
  2) internal aliases (`@/...`),
  3) relative imports.
- Separate groups with a blank line when it improves readability.
- Avoid deep relative chains when an alias import is possible.

## React / Next.js Patterns

- App Router conventions apply in `src/app`.
- Default export is standard for route files (`page.tsx`, `layout.tsx`).
- Use named exports for reusable utilities/components where possible.
- Add `"use client"` only when client-side hooks/events/browser APIs are required.
- Keep server/client boundaries intentional; avoid accidental client-only APIs in server components.

## Component Patterns

- Follow existing shadcn-style component composition in `src/components/ui`.
- Use `cn(...)` from `src/lib/utils.ts` for class merging.
- Reuse existing UI primitives before creating new base components.
- Preserve `asChild` and slot-based composition patterns when extending primitives.
- Keep props pass-through behavior intact for wrapper components.

## Naming Conventions

- Components/types/interfaces: PascalCase (`ButtonGroup`, `UserCardProps`).
- Functions/variables: camelCase (`getUserProfile`, `isLoading`).
- Hooks: `useX` naming (`useIsMobile`).
- Constants: UPPER_SNAKE_CASE for true constants (`MOBILE_BREAKPOINT`).
- Files under `src/components/ui`: kebab-case (existing convention).

## Formatting

- No dedicated Prettier config is present.
- Match local file style and avoid unrelated formatting churn.
- Some files use semicolons and some do not; preserve surrounding style per file.
- Keep lines reasonably short and JSX readable over compactness.

## Styling

- Tailwind CSS is the primary styling approach.
- Prefer utility classes and composition over custom one-off CSS files.
- Keep global styles in `src/app/globals.css`; avoid unnecessary global leakage.
- Use design tokens/variables already present before introducing new tokens.

## Error Handling

- Fail fast on invalid states; do not silently swallow errors.
- In async code, handle and propagate errors with actionable context.
- For UI-facing failures, surface user-meaningful messages when possible.
- For server-side logic, log context-rich errors and avoid leaking sensitive internals.

## Accessibility and UX

- Preserve keyboard/focus behavior from existing primitives.
- Use semantic HTML and ARIA attributes where appropriate.
- Ensure interactive elements have accessible names (`aria-label`, visible text, etc.).
- Keep color contrast and focus states intact when restyling components.

## Agent Workflow Expectations

- Before edits, inspect nearby patterns and follow them.
- Prefer minimal, targeted changes over broad refactors.
- Do not change toolchain config unless task requires it.
- Do not introduce new dependencies without clear need.
- If adding tests/tooling, update `package.json` scripts and this file in the same change.

## Verification Checklist for Agents

- Run `pnpm lint` after code changes.
- Run `pnpm exec tsc --noEmit` when changing TS-heavy logic.
- Run `pnpm build` for changes affecting routing/build/runtime behavior.
- If tests are added later, run full test suite and at least one single-test command.

## Notes for Future Updates

- If test framework is added, replace the "Tests (Current State)" section with exact commands.
- If Cursor/Copilot rules are introduced, mirror key constraints in this file.
- Keep this document concise, actionable, and aligned with real repo configuration.
