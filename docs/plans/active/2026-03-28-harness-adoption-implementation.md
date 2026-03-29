# Harness Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt a balanced agent-first harness for this repository by adding root agent instructions, a durable docs structure, enforced runtime/tooling baselines, CI verification, and Playwright-based browser validation for critical flows.

**Architecture:** Keep the existing application architecture intact while adding an operational layer around it. The implementation is split into focused tasks: documentation and repo structure first, toolchain and verification second, browser harness third, and structural guardrails and cleanup last. Each task is independently testable and moves the repo toward the approved harness design without introducing heavy observability or over-broad automation.

**Tech Stack:** Next.js 14, React 18, TypeScript, Vitest, ESLint, Playwright, GitHub Actions

---

### Task 1: Establish root agent docs and repository knowledge map

**Files:**
- Create: `AGENTS.md`
- Create: `docs/README.md`
- Create: `docs/architecture/README.md`
- Create: `docs/runbooks/README.md`
- Create: `docs/runbooks/chat-ai.md`
- Create: `docs/runbooks/map.md`
- Create: `docs/runbooks/agenda-calendar.md`
- Create: `docs/runbooks/admin-data.md`
- Create: `docs/runbooks/supabase.md`
- Modify: `README.md`

- [ ] Inspect the approved design doc in `docs/specs/2026-03-28-harness-adoption-design.md` and extract the rules that must be surfaced to agents and humans.
- [ ] Write `AGENTS.md` as a short index containing:
  - runtime requirement (`Node.js 20+`)
  - canonical commands (`dev`, `typecheck`, `lint`, `test`, `build`, `verify`, `e2e`, `harness:smoke`)
  - when to write specs versus plans
  - the current hotspot files
  - links to `docs/README.md` and the main runbooks
- [ ] Write `docs/README.md` as a task-oriented index with sections for:
  - where to start for architecture work
  - where to start for browser/UI work
  - where to start for data/admin/integration work
  - where specs and plans live now
- [ ] Write the base runbooks using the current codebase as source of truth, not generic descriptions.
- [ ] Update `README.md` so the human-facing docs point to the new docs structure instead of leaving the harness implicit.
- [ ] Verify the docs paths are internally consistent.

Run:
```bash
rg -n "docs/superpowers|docs/specs|docs/plans|AGENTS.md" README.md AGENTS.md docs
```

Expected:
- New docs structure is referenced.
- No accidental references point new harness docs back to `docs/superpowers` as the default home.

### Task 2: Enforce the runtime and verification baseline

**Files:**
- Create: `.nvmrc`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] Write a failing verification expectation first by adding a new script contract in `package.json` for:
  - `typecheck`
  - `verify`
  - placeholder browser scripts if Playwright is not added until Task 4
- [ ] Run the new commands to confirm the current baseline breaks as expected on the missing pieces.
- [ ] Add `.nvmrc` with the repo's required Node major version.
- [ ] Add `engines` to `package.json` matching the enforced Node baseline.
- [ ] Implement `typecheck` using `tsc --noEmit`.
- [ ] Implement `verify` as the stable full validation entry point.
- [ ] Update README and AGENTS to make the runtime/toolchain requirement explicit.

Run:
```bash
cat .nvmrc
npm run typecheck
npm run lint
npm test
npm run build
```

Expected:
- `.nvmrc` prints a Node 20 line.
- `typecheck` exists and runs.
- Any remaining failures are real repo issues to fix, not missing command definitions.

### Task 3: Add CI for the canonical verification pipeline

**Files:**
- Create: `.github/workflows/verify.yml`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] Create a GitHub Actions workflow that runs on push and pull request.
- [ ] Use the same Node version as `.nvmrc` or the package engines requirement.
- [ ] Install dependencies and run:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
- [ ] Add minimal workflow naming and caching only if it stays obvious.
- [ ] Document in AGENTS and README that `npm run verify` is the local mirror of the CI contract.

Run:
```bash
sed -n '1,240p' .github/workflows/verify.yml
```

Expected:
- The workflow is short, readable, and mirrors the local verification contract.

### Task 4: Install Playwright and add the browser harness foundation

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/fixtures.ts`
- Create: `tests/e2e/login.spec.ts`
- Create: `tests/e2e/navigation-smoke.spec.ts`
- Create: `tests/e2e/admin-chat.spec.ts`
- Modify: `package.json`
- Modify: `.gitignore` (if needed)
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/README.md`

- [ ] Add Playwright dependencies and browser scripts in `package.json`.
- [ ] Install the Playwright browser harness with a configuration that can run locally against the app.
- [ ] Add shared fixtures/helpers that:
  - navigate to the app
  - use the demo login flow
  - wait for stable app readiness
  - expose screenshot capture if needed
- [ ] Write the first failing browser tests for the agreed critical flows:
  - login
  - dashboard visibility
  - map navigation
  - agenda weekly view
  - agenda evaluations view
  - admin entry
  - chat open/basic readiness
- [ ] Run those tests and watch them fail for the right reasons before implementing missing harness pieces.
- [ ] Add any minimal helper logic needed to make the flows stable.

Run:
```bash
npm run e2e -- --grep "login"
npm run harness:smoke
```

Expected:
- Browser tests run through Playwright.
- Smoke flow covers the application's most important visible surfaces.

### Task 5: Make the browser harness stable and agent-friendly

**Files:**
- Modify: `tests/e2e/fixtures.ts`
- Modify: `tests/e2e/navigation-smoke.spec.ts`
- Modify: `tests/e2e/admin-chat.spec.ts`
- Modify: `docs/runbooks/README.md`
- Create: `docs/runbooks/browser-harness.md`
- Modify: `AGENTS.md`

- [ ] Add stable selectors and waiting strategies using the current app's accessible labels and route cues.
- [ ] Capture console or network failures where it improves debugging without making the tests noisy.
- [ ] Write a dedicated browser harness runbook explaining:
  - what the smoke flow covers
  - when browser tests may mutate real state
  - how to run headless versus headed
  - where artifacts are stored
- [ ] Document the browser harness entry points in `AGENTS.md`.

Run:
```bash
npm run e2e
```

Expected:
- The browser harness completes without relying on manual interaction.
- The docs explain how an agent should use it.

### Task 6: Add the first structural guardrails and hotspot documentation

**Files:**
- Create: `docs/architecture/hotspots.md`
- Create: `tests/architecture/hotspots-source.test.ts`
- Modify: `AGENTS.md`
- Modify: `docs/architecture/README.md`
- Modify: `package.json`

- [ ] Document the first-class hotspot files named in the harness spec.
- [ ] Add a lightweight structural test that locks in the hotspot list and can grow later into stronger architecture checks.
- [ ] If practical, add one narrowly scoped size-based or source-based guard against silent growth in the worst hotspot file.
- [ ] Wire this new structural check into the existing test pipeline without introducing flakiness.

Run:
```bash
npm test -- tests/architecture/hotspots-source.test.ts
```

Expected:
- Structural guardrails exist as executable checks, not only prose.

### Task 7: Rehome legacy spec/plan paths and normalize docs references

**Files:**
- Modify: `docs/superpowers/specs/2026-03-26-internal-refactor-stability-design.md`
- Modify: `docs/superpowers/plans/2026-03-26-internal-refactor-stability.md`
- Modify: `README.md`
- Modify: `docs/README.md`

- [ ] Review the older spec and plan files still under `docs/superpowers/`.
- [ ] Update them with top-level notes pointing readers to the new default docs structure so the repo does not present two competing conventions.
- [ ] Do not rewrite their historical content unnecessarily.
- [ ] Ensure the new docs index explains that legacy entries may still exist under `docs/superpowers/` while the repo transitions.

Run:
```bash
rg -n "docs/superpowers|docs/specs|docs/plans" docs README.md AGENTS.md
```

Expected:
- The repo presents a single clear forward path even if legacy docs remain.

### Task 8: Final verification and cleanup

**Files:**
- Review all changed files from Tasks 1-7

- [ ] Run the full verification pipeline.
- [ ] Run the browser smoke flow.
- [ ] Fix any broken docs paths, script names, or CI mismatches.
- [ ] Review the final diff to ensure the harness stays concise and practical.

Run:
```bash
npm run verify
npm run harness:smoke
git diff --stat
```

Expected:
- Verification passes.
- Browser smoke flow passes.
- The diff reflects the approved harness scope and not unrelated refactors.
