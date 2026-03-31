# ChatGPT Custom MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose a remote MCP server from the existing Next.js app so a custom GPT in ChatGPT can read and mutate the same academic admin data the web admin mode already manages.

**Architecture:** Keep transport concerns in `app/api/mcp/route.ts`, register MCP tools from `lib/mcp/*`, and extract reusable business logic into `lib/admin/*` so the existing REST routes and the new MCP server share one source of truth. Build the feature in thin slices: route contract first, then service extraction per domain, then MCP tool registration, then docs and verification.

**Tech Stack:** Next.js 14 route handlers, TypeScript, Zod, Supabase server client, MCP handler adapter, Model Context Protocol SDK, Vitest

---

### Task 1: Add the MCP transport dependency and route contract

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `app/api/mcp/route.ts`
- Create: `tests/mcp/mcp-route-source.test.ts`

- [ ] **Step 1: Write the failing route contract test**
  - Assert that `app/api/mcp/route.ts` exports `runtime = "nodejs"`.
  - Assert that `app/api/mcp/route.ts` exports `dynamic = "force-dynamic"`.
  - Assert that the file exports `GET` and `POST`.
- [ ] **Step 2: Run the targeted test and watch it fail**

Run:
```bash
npm test -- tests/mcp/mcp-route-source.test.ts
```

Expected:
- Fail because the route file does not exist yet.

- [ ] **Step 3: Install MCP dependencies**
  - Add `mcp-handler`
  - Add `@modelcontextprotocol/sdk`
- [ ] **Step 4: Add the minimal MCP route**
  - Create a handler-backed route with empty server registration.
  - Set `basePath` to `/api`.
  - Export `GET` and `POST`.
- [ ] **Step 5: Re-run the targeted route contract test**

Run:
```bash
npm test -- tests/mcp/mcp-route-source.test.ts
```

Expected:
- Pass with the route contract now present.

### Task 2: Extract reusable admin services for terms and subjects

**Files:**
- Create: `lib/admin/terms.ts`
- Create: `lib/admin/subjects.ts`
- Modify: `app/api/terms/route.ts`
- Modify: `app/api/terms/[id]/route.ts`
- Modify: `app/api/subjects/route.ts`
- Modify: `app/api/subjects/[id]/route.ts`
- Create: `tests/admin/terms.test.ts`
- Create: `tests/admin/subjects.test.ts`

- [ ] **Step 1: Write failing tests for term and subject service behavior**
  - Validate schemas accept the same payloads as the current routes.
  - Validate term label rules for create vs patch.
  - Validate “set current term” behavior clears the previous current flag.
- [ ] **Step 2: Run the targeted tests and confirm they fail**

Run:
```bash
npm test -- tests/admin/terms.test.ts tests/admin/subjects.test.ts
```

Expected:
- Fail because the service modules do not exist yet.

- [ ] **Step 3: Implement `lib/admin/terms.ts`**
  - Export create/list/update/delete helpers.
  - Reuse a shared select string for return payloads.
- [ ] **Step 4: Implement `lib/admin/subjects.ts`**
  - Export create/list/update/delete helpers with route-equivalent schemas.
- [ ] **Step 5: Refactor term and subject routes to use the services**
- [ ] **Step 6: Re-run the targeted tests**

Run:
```bash
npm test -- tests/admin/terms.test.ts tests/admin/subjects.test.ts
```

Expected:
- Pass with route-equivalent behavior preserved.

### Task 3: Extract reusable admin services for enrollments, events, and CBC bootstrap

**Files:**
- Create: `lib/admin/enrollments.ts`
- Create: `lib/admin/events.ts`
- Create: `lib/admin/bootstrap-cbc.ts`
- Modify: `app/api/enrollments/route.ts`
- Modify: `app/api/enrollments/[id]/route.ts`
- Modify: `app/api/events/route.ts`
- Modify: `app/api/events/[id]/route.ts`
- Modify: `app/api/admin/bootstrap-cbc/route.ts`
- Create: `tests/admin/enrollments.test.ts`
- Create: `tests/admin/events.test.ts`
- Create: `tests/admin/bootstrap-cbc.test.ts`

- [ ] **Step 1: Write failing tests for service-layer schemas and edge cases**
  - Enrollment schedule schema and missing-schedule fallback path.
  - Event payload schema and patch behavior.
  - CBC status and bootstrap payload shape.
- [ ] **Step 2: Run the targeted tests and confirm they fail**

Run:
```bash
npm test -- tests/admin/enrollments.test.ts tests/admin/events.test.ts tests/admin/bootstrap-cbc.test.ts
```

Expected:
- Fail because the new services do not exist yet.

- [ ] **Step 3: Implement `lib/admin/enrollments.ts`**
  - List/create/update/delete helpers.
  - Preserve schedule-column fallback behavior.
- [ ] **Step 4: Implement `lib/admin/events.ts`**
  - List/create/update/delete helpers.
  - Preserve post-write re-fetch behavior with schedule fallback.
- [ ] **Step 5: Implement `lib/admin/bootstrap-cbc.ts`**
  - Move status and bootstrap logic out of the route handler.
- [ ] **Step 6: Refactor the routes to call the services**
- [ ] **Step 7: Re-run the targeted tests**

Run:
```bash
npm test -- tests/admin/enrollments.test.ts tests/admin/events.test.ts tests/admin/bootstrap-cbc.test.ts
```

Expected:
- Pass with extracted logic preserving current route behavior.

### Task 4: Register MCP tools on top of the shared admin services

**Files:**
- Create: `lib/mcp/server.ts`
- Create: `lib/mcp/tools.ts`
- Modify: `app/api/mcp/route.ts`
- Create: `tests/mcp/tool-registry.test.ts`

- [ ] **Step 1: Write a failing MCP registry test**
  - Assert the expected tool names are registered.
  - Assert there are both read and write tools.
- [ ] **Step 2: Run the targeted test and confirm it fails**

Run:
```bash
npm test -- tests/mcp/tool-registry.test.ts
```

Expected:
- Fail because the registry module does not exist yet.

- [ ] **Step 3: Implement the MCP server registration**
  - Register read tools for terms, subjects, enrollments, events, snapshot, CBC status.
  - Register write tools for terms, subjects, enrollments, events, CBC bootstrap.
  - Return structured JSON results plus short text summaries.
- [ ] **Step 4: Wire the route to the registry module**
- [ ] **Step 5: Re-run the targeted registry test**

Run:
```bash
npm test -- tests/mcp/tool-registry.test.ts
```

Expected:
- Pass with the expected public MCP surface.

### Task 5: Add connection docs and repo runbook updates

**Files:**
- Create: `docs/runbooks/mcp-chatgpt.md`
- Modify: `docs/README.md`
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] **Step 1: Write the documentation updates**
  - Describe the MCP endpoint path.
  - List any required env vars.
  - Document the intentionally open first-iteration access model.
  - Add step-by-step setup for a custom GPT in ChatGPT.
- [ ] **Step 2: Verify docs discoverability**

Run:
```bash
rg -n "mcp|ChatGPT|custom GPT" README.md AGENTS.md docs
```

Expected:
- The MCP runbook is discoverable from the main docs indexes.

### Task 6: Full verification and deployment readiness

**Files:**
- Review all changed files from Tasks 1-5

- [ ] **Step 1: Run targeted tests for the new feature slices**

Run:
```bash
npm test -- tests/mcp tests/admin
```

Expected:
- New targeted coverage passes.

- [ ] **Step 2: Run repository-wide static and build verification**

Run:
```bash
npm run typecheck
npm test
npm run build
```

Expected:
- Typecheck, tests, and build complete successfully.

- [ ] **Step 3: Review the final diff for scope discipline**

Run:
```bash
git diff --stat
```

Expected:
- Diff shows MCP transport, shared admin services, tests, and docs only.
