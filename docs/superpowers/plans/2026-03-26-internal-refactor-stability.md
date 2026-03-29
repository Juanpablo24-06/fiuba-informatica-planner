> Legacy location note: newer implementation plans should live under `docs/plans/active/` or `docs/plans/completed/`. This file remains here as historical context from the previous docs convention.

# Internal Refactor Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve code organization, reduce internal bug risk, and make the project easier to extend while keeping the visible UX unchanged.

**Architecture:** Preserve the current Next.js product surface and refactor internally by extracting pure logic into focused modules, splitting broad domain files, and adding regression-oriented unit tests. Avoid UI/UX changes and keep public component boundaries stable unless a bug fix requires a minimal adjustment.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Supabase, Vitest, Testing Library

---

### Task 1: Add a lightweight regression-test baseline

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `tests/helpers/render.tsx`

- [ ] Add test dependencies and scripts for a lightweight unit-test workflow.
- [ ] Configure Vitest with the existing `@/*` path alias and jsdom environment.
- [ ] Add a minimal shared setup file for DOM assertions and browser-like helpers.
- [ ] Verify the new test command runs successfully even before feature tests are added.

### Task 2: Refactor dashboard / summary preparation logic

**Files:**
- Modify: `app/(app)/page.tsx`
- Modify: `components/dashboard/summary-progress-bar.tsx`
- Modify: `lib/queries.ts`
- Create: `lib/dashboard/summary.ts`
- Create: `lib/dashboard/progress-segments.ts`
- Create: `tests/dashboard/summary.test.ts`
- Create: `tests/dashboard/progress-segments.test.ts`

- [ ] Extract dashboard data shaping and event/load calculation into pure helpers.
- [ ] Extract summary progress segment-building logic so the UI component focuses on rendering.
- [ ] Reduce inline transformation logic inside `app/(app)/page.tsx`.
- [ ] Add tests that lock current summary behavior and edge cases.

### Task 3: Refactor chat client and server support code

**Files:**
- Modify: `components/dashboard/chat-panel.tsx`
- Modify: `app/api/chat/route.ts`
- Modify: `lib/ai/admin-actions.ts`
- Create: `components/dashboard/chat-panel.types.ts`
- Create: `components/dashboard/chat-panel.constants.ts`
- Create: `components/dashboard/chat-panel.storage.ts`
- Create: `components/dashboard/chat-panel.streaming.ts`
- Create: `lib/ai/admin-action-utils.ts`
- Create: `lib/ai/chat-context.ts`
- Create: `tests/chat/chat-panel.streaming.test.ts`
- Create: `tests/chat/admin-action-utils.test.ts`

- [ ] Separate static chat config, local-storage helpers, and streaming helpers from the main chat panel component.
- [ ] Extract admin-action normalization helpers from `lib/ai/admin-actions.ts`.
- [ ] Extract chat request context building from the route handler where practical.
- [ ] Add tests for the most bug-prone pure logic extracted from chat support code.

### Task 4: Refactor map layout and transition logic

**Files:**
- Modify: `components/map/map-view.tsx`
- Modify: `components/layout/map-transition-coordinator.tsx`
- Create: `components/map/map-layout.ts`
- Create: `components/map/map-constants.ts`
- Create: `components/map/map-geometry.ts`
- Create: `components/layout/map-transition-store.ts`
- Create: `tests/map/map-layout.test.ts`
- Create: `tests/map/map-transition-store.test.ts`

- [ ] Move pure map constants and layout helpers out of the view component.
- [ ] Extract transition-store and state comparison helpers from the transition coordinator.
- [ ] Keep existing component props and visible behavior unchanged.
- [ ] Add regression tests for extracted pure map logic and transition-state behavior.

### Task 5: Verification and code review

**Files:**
- Review all changed files from Tasks 1-4

- [ ] Run unit tests.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Perform a final review for accidental UX changes, unstable abstractions, and deferred follow-ups.
