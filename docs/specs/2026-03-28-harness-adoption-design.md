# Harness Adoption Design

**Date:** 2026-03-28

## Context

This repository already has a solid product surface and a usable internal structure, but it still depends too heavily on conversational context and human memory when work becomes complex. The project has:

- a strong human-oriented README
- a meaningful test baseline
- clear product domains such as map, dashboard, chat, agenda, and admin
- an existing habit of writing specs and plans for larger work

What it does not yet have is the agent-oriented harness described in OpenAI's harness engineering approach: a short root instruction file, a repo-local knowledge base, living execution plans, reproducible browser validation, and mechanical guardrails that keep the system legible over time.

The goal of this design is to adopt that approach in a version that fits this repository's current size and risk profile.

## Goals

- Make the repository itself the durable system of record for agent work.
- Reduce dependence on chat memory for architecture, workflow, and verification rules.
- Add browser-driven validation so agents can inspect and validate the real UI.
- Stabilize the local execution loop so agent work is reproducible.
- Introduce a small but meaningful set of mechanical guardrails.
- Keep the adoption practical and incremental rather than overengineered.

## Non-Goals

- Reproduce OpenAI's full internal platform.
- Introduce heavy observability infrastructure in the first phase.
- Automate end-to-end PR-to-merge autonomy immediately.
- Replace the existing README as the human onboarding entry point.

## Chosen Approach

This work will follow the previously approved "balanced" adoption path:

1. Establish the repository as an agent-readable operating environment.
2. Formalize living plans and lightweight design documentation.
3. Add browser automation from the start so UI work is validated against the real application.
4. Add only the first layer of guardrails now, leaving heavier observability and automation for later.

## Target Repository Structure

The repository should gain a clearer separation between human onboarding, agent operating instructions, durable system knowledge, and executable validation.

### Root files

- `README.md`
  - Remains the human-facing entry point for product overview, setup, environment variables, and everyday scripts.
- `AGENTS.md`
  - Becomes the short operational index for coding agents.
  - It should stay concise and point to deeper docs instead of duplicating them.

### Documentation structure

- `docs/README.md`
  - Index explaining what to read first depending on task type.
- `docs/architecture/`
  - System map, domain boundaries, invariants, and hotspots.
- `docs/runbooks/`
  - Operational guides for sensitive areas such as chat, map, agenda/calendar, admin/data, and Supabase.
- `docs/specs/`
  - Design documents written before larger structural or behavioral changes.
- `docs/plans/active/`
  - Living execution plans for ongoing medium or large tasks.
- `docs/plans/completed/`
  - Completed plans kept as historical execution context.
- `docs/decisions/`
  - Small focused decisions that do not need a full spec.

### Validation and tooling structure

- `tests/e2e/` or `playwright/`
  - End-to-end browser flows, shared fixtures, and browser helpers.
- `scripts/`
  - Canonical repo commands for verification and harness-specific workflows.

### Migration note

The current `docs/superpowers/*` structure is a useful seed, but it should no longer be the long-term home for system knowledge. Existing specs and plans can either be migrated or temporarily mirrored while the new structure becomes the default.

## Domain Model For Documentation And Validation

The harness should treat the following as the primary system domains:

- dashboard/agenda
- map
- chat/ai
- admin/data

Each domain should eventually have:

- a short architecture note
- a runbook for safe modifications
- clear validation expectations
- a list of the most sensitive files and behaviors

This matches the actual risk concentration in the current codebase and makes parallel agent work easier to scope.

## Operating Workflow

The harness should define a consistent workflow for different change sizes.

### Small changes

Small, isolated changes may proceed without a formal spec or plan when all of the following are true:

- they affect a single area
- the change is local and easy to reason about
- the required validation is obvious and short

### Medium and large changes

Medium or large changes should create a living plan in `docs/plans/active/`.

These include work that:

- touches multiple files or domains
- changes behavior in user-facing flows
- modifies data behavior or external integrations
- requires phased implementation or follow-up validation

### When to write a spec

A spec should be written before implementation when the work involves:

- architectural change
- new tooling or process adoption
- non-obvious tradeoffs
- changes whose shape should be reviewed before code is touched

### Plan lifecycle

- Work starts in `docs/plans/active/`.
- The plan is updated as the task progresses.
- Once complete, the plan moves to `docs/plans/completed/`.

### Expected plan content

Each living plan should contain:

- goal
- scope
- affected files or subsystems
- required verification
- execution checklist
- risks
- rollback or recovery notes where relevant
- current status

This plan format should be self-contained enough that an agent can resume work from the plan without relying on prior chat history.

## Canonical Commands

The harness should make the repository's standard operating commands explicit and stable.

### Existing commands to preserve

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run dev`

### New commands to add

- `npm run typecheck`
  - Explicit type validation independent of build.
- `npm run verify`
  - Canonical repo verification command.
  - First phase should run typecheck, lint, tests, and build in a predictable order.
- `npm run e2e`
  - Headless browser validation for critical flows.
- `npm run e2e:headed`
  - Visual browser run for interactive debugging or inspection.
- `npm run harness:smoke`
  - Short sanity flow that checks the most important product surfaces quickly.

The purpose of these commands is not convenience alone. They are the stable contract that both humans and agents rely on.

## Runtime And Toolchain Baseline

This repository already documents Node.js 20+ as recommended, but that requirement is not enforced strongly enough. In the current environment:

- `lint` passes
- `build` passes
- `test` fails under Node 18 due to the Vitest/Rolldown runtime requiring newer Node APIs

The harness adoption should therefore harden the runtime baseline.

### Required changes

- Add a repo-level Node version file such as `.nvmrc`.
- Add `engines` to `package.json`.
- Add an explicit `typecheck` script.
- Make the expected runtime visible in `AGENTS.md` and `README.md`.

The repository should stop merely recommending the correct runtime and start enforcing it.

## Browser Harness Design

Browser automation is part of the approved first phase because this application is highly interactive and visual. Agent work on this project should not rely on source inspection alone.

### Browser harness goals

- Validate the real UI instead of only internal logic.
- Reproduce and verify bugs in user-facing flows.
- Gather screenshots and browser-level evidence when needed.
- Provide a reliable smoke path after changes.

### Recommended foundation

Use Playwright as the first practical browser harness layer.

This choice serves as the project's real-world equivalent of the Chrome DevTools-connected browser workflow described in OpenAI's article. It supports:

- real navigation
- DOM inspection
- screenshots
- console and network inspection
- flow scripting

### Initial critical flows

The first phase should cover:

- login flow
- dashboard load
- map navigation and visible readiness
- agenda weekly view
- agenda evaluations view
- chat panel open and basic interaction
- admin entry

### Browser helpers

Shared helpers should support:

- login demo
- common navigation
- stable waiting points
- screenshot capture
- smoke assertions

### Operational stance

Because the user explicitly approved full interaction, the browser harness is not restricted to read-only flows by default. That said, the documentation must clearly state when a flow can mutate real data or trigger external integrations.

## Guardrails

The first phase should introduce a small but effective set of mechanical constraints.

### Guardrails to add now

- CI should run the main verification pipeline.
- Type validation should become explicit and mandatory.
- Browser smoke coverage should exist for core flows.
- Agent and doc operating rules should be versioned in the repo.
- Architectural hotspots should be named and documented.

### First structural checks to consider

- file size limits for selected hotspots
- import boundary rules between domains
- validation requirements at API boundaries
- explicit prohibition on expanding already oversized controller-style modules without extraction

These checks should stay narrow and practical. The point is not to create bureaucracy, but to stop the most expensive forms of drift.

## Hotspots To Treat As First-Class Risks

The harness should explicitly name today's highest-risk files and subsystems so future work does not treat them as ordinary low-cost edit targets.

Initial hotspots include:

- `components/map/map-view.tsx`
- `components/dashboard/term-manager.tsx`
- `components/dashboard/course-workspace-drawer.tsx`
- `components/dashboard/chat-panel.tsx`
- `app/api/chat/route.ts`
- `lib/ai/admin-actions.ts`

These areas justify stronger documentation, browser validation, and future architectural checks.

## Security And Operational Reality

This repository is not a toy frontend. It includes routes and integrations that can mutate application state and external systems.

Examples include:

- demo auth creating an authenticated session
- admin flows mutating academic data
- calendar sync endpoints
- AI-assisted admin actions

For that reason, harness docs and browser docs should explicitly distinguish:

- safe UI inspection flows
- data-mutating flows
- external integration flows

The user has approved full interaction, so this phase does not artificially restrict browser automation to read-only mode. However, the docs should make the operational consequences explicit so agent autonomy is informed rather than accidental.

## Phase 1 Deliverables

The first implementation phase should include:

- root `AGENTS.md`
- new `docs/` structure and index
- migration or rehoming path for current specs and plans
- base architecture and runbook docs for the main domains
- formalized plan convention
- `.nvmrc` and runtime enforcement in `package.json`
- `typecheck` and `verify` scripts
- Playwright setup and initial smoke/browser flows
- CI running the baseline verification pipeline
- browser harness usage documentation

## Success Criteria

This adoption is successful if:

- an agent can discover how to work in the repo from local files alone
- medium and large tasks have a clear written execution path
- browser-based validation exists for the core product flows
- runtime/tooling issues are less likely to fail silently due to environment mismatch
- the repository has a small set of enforceable guardrails rather than purely social rules
- the harness improves clarity and execution without becoming bloated

## Deferred Work

The following are intentionally deferred until after the first phase proves useful:

- heavier observability stack
- automated documentation gardening
- quality score systems
- broader structural linting coverage
- higher-autonomy PR-to-merge workflows

## Recommendation

This repository should adopt the balanced harness model now.

The highest-leverage first move is not exotic tooling. It is making the repo locally legible, operationally reproducible, and browser-verifiable. Once that baseline exists, more advanced agent autonomy will have a stable foundation instead of amplifying current ambiguity.
