> Legacy location note: newer design docs should live under `docs/specs/`. This file remains here as historical context from the previous docs convention.

# Internal Refactor Stability Design

**Date:** 2026-03-26

**Context**

This project already has a solid product surface, but several core areas have grown into large multi-responsibility modules. The user's priorities are:

- Keep the visible UX, layout, colors, and interactions unchanged.
- Improve internal order and maintainability.
- Reduce bug risk.
- Make future changes easier.
- Accept ambitious internal refactoring as long as the user-facing experience stays the same.

**Scope**

This work focuses on internal-only improvements in the three most important areas named by the user:

- Map
- Summary / dashboard
- Chat

The work also includes safe bug fixes and targeted test coverage where it materially reduces regression risk.

**Out of Scope**

- Visual redesign
- UX changes
- Animation redesign
- New features that alter user behavior
- Re-architecting the app away from Next.js

## Approach

The refactor will preserve the existing UI contract while reducing internal coupling. The main strategy is:

1. Extract pure logic from oversized components and routes into focused modules.
2. Split broad data-access and action modules by domain responsibility.
3. Add regression-oriented unit tests around extracted pure logic and bug-prone transformations.
4. Keep rendering structure and public component APIs stable wherever possible.

## Targeted Improvements

### 1. Establish a safe testing baseline

The repository currently has no test suite. A lightweight unit-test setup will be added so internal refactors can be verified without changing runtime behavior.

### 2. Dashboard / summary decomposition

The dashboard page currently performs data loading, filtering, event merging, load estimation, and presentation preparation in one place. That logic will be split into focused helpers so the page becomes easier to read and less fragile.

### 3. Chat decomposition

The chat client and server code each combine too many concerns:

- client state + storage + streaming simulation + provider selection + UI
- server validation + context assembly + diagnostics + persistence + admin action execution

These concerns will be separated into smaller modules while preserving the same visible experience.

### 4. Map stabilization

The map view and transition logic carry a high maintenance burden due to size and responsibility mixing. Pure layout and geometric logic will be extracted first, with the goal of preserving behavior while making future fixes safer.

## Risk Management

Because the user explicitly wants the app to look and behave the same, changes must be conservative at the component boundary. Refactors should prefer:

- extracting logic rather than changing markup
- preserving prop names
- preserving CSS class output unless required for a bug fix
- adding tests before or alongside logic movement

## Success Criteria

The work is successful if:

- The visible application experience remains effectively unchanged.
- The main hotspot files shrink and become easier to reason about.
- Internal logic is split into clearer modules.
- The project gains at least a minimal regression test baseline.
- Lint and production build pass after the refactor.

## Planned Deliverables

- Internal refactor branch: `codex/internal-refactor-stability`
- New internal helper modules for dashboard, chat, and map logic
- Initial unit-test setup with targeted regression coverage
- Safe bug fixes discovered during the refactor
- Final summary with future improvements that are worth doing later but are intentionally deferred
