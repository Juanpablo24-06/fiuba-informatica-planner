# ChatGPT Custom MCP Design

**Date:** 2026-03-30

## Context

The repository already includes a private admin surface for FIUBA planning data and an embedded AI chat. The current backend can already mutate real academic data through typed HTTP routes and a smaller set of AI-assisted admin actions. What it does not expose yet is a remote MCP server that ChatGPT can connect to as a custom GPT connector.

The user explicitly wants the first usable version to optimize for fast adoption and low setup friction:

- same Vercel project
- no separate backend required
- no OAuth or per-user identity in the first iteration
- ChatGPT connector should be able to read and write with the same breadth as the current admin mode

This design intentionally accepts a higher security risk for the first iteration so the integration can be tested end-to-end quickly. The design should still keep the code structured so hardening can be added later without rewriting the server.

## Goals

- Expose a remote MCP server from the existing Next.js app.
- Keep the MCP server in the same Vercel deployment as the product.
- Reuse the real admin business logic instead of duplicating route behavior.
- Cover the current admin data surface: terms, subjects, enrollments, events, and CBC bootstrap.
- Provide a concise setup guide for connecting the deployed endpoint to a custom GPT in ChatGPT.

## Non-Goals

- OAuth, SSO, or per-user identity mapping.
- Fine-grained authorization beyond the intentionally open first iteration.
- Terminal, Vercel, shell, or infrastructure control.
- General-purpose SQL execution or arbitrary database access.
- Embedded MCP app UI widgets; this iteration focuses on tools, not custom iframe surfaces.

## Chosen Approach

The application will expose a new remote MCP endpoint inside the same app, using a Next.js route handler and an MCP transport adapter that supports Streamable HTTP/SSE on Vercel.

The route will register a curated set of tools that map to the current admin feature set. Each tool will call shared server-side admin services in `lib/admin/*`, and those services will become the single source of truth for mutations currently performed by the existing REST routes.

The HTTP routes remain in place for the web app. MCP becomes an additional entry point into the same backend capabilities.

## Transport And Runtime

### Endpoint shape

- New endpoint: `app/api/mcp/route.ts`
- Runtime: Node.js
- Dynamic server execution enabled explicitly

### Transport choice

Use a Next/Vercel-compatible MCP handler instead of implementing the wire protocol manually. The handler should support the transports ChatGPT can consume for remote MCP connectors.

### Deployment model

The MCP endpoint ships in the same Next.js app and deploys with the same Vercel project and environment variables. No second service is required for the first iteration.

## Capability Scope

The MCP server should expose explicit tools, grouped by domain.

### Read tools

- `list_terms`
- `get_current_term`
- `list_subjects`
- `list_enrollments`
- `list_events`
- `get_admin_snapshot`
- `get_bootstrap_cbc_status`

### Write tools

- `create_term`
- `update_term`
- `delete_term`
- `create_subject`
- `update_subject`
- `delete_subject`
- `create_enrollment`
- `update_enrollment`
- `delete_enrollment`
- `create_event`
- `update_event`
- `delete_event`
- `bootstrap_cbc`

### Tool philosophy

- Tools must stay typed and domain-specific.
- Tool descriptions should tell ChatGPT when to use them and what they return.
- The server must not expose a generic “run any mutation” primitive.

## Shared Admin Service Layer

The current admin behavior is split across several API routes and `lib/ai/admin-actions.ts`. That is workable for the web app, but it would cause drift if MCP added a parallel implementation.

To prevent that, business logic should be extracted into focused server-side services:

- `lib/admin/terms.ts`
- `lib/admin/subjects.ts`
- `lib/admin/enrollments.ts`
- `lib/admin/events.ts`
- `lib/admin/bootstrap-cbc.ts`

Each service should provide:

- input schema or input normalization
- query/mutation functions
- consistent selection payloads returned after writes
- domain-level errors that route handlers and MCP tools can translate into transport-specific responses

The existing REST routes should be updated to call these services.

## Data And Output Design

The MCP output should prioritize compact, model-friendly summaries while still including enough structure for follow-up tool calls.

### Read responses

Read tools should return JSON objects with:

- top-level collection key (`terms`, `subjects`, `enrollments`, `events`)
- summary counts where useful
- the canonical IDs required for follow-up mutations

### Write responses

Write tools should return:

- `ok`
- the updated entity where relevant
- a short natural-language summary

This keeps the connector usable both for agent planning and for natural language follow-up inside ChatGPT.

## Access Model

The MCP route exposes admin-capable tools over HTTP, so the current implementation requires either a valid web admin session or bearer auth through `MCP_BEARER_TOKEN` / `EXTERNAL_ADMIN_BEARER_TOKEN`.

### Guardrails still worth keeping

The implementation should include:

- an environment flag to disable MCP entirely
- bearer-token protection for remote clients
- explicit tool registration only for intended capabilities
- no arbitrary SQL or raw Supabase access
- no terminal or infrastructure actions

### Deferred hardening

The design should make room for later additions:

- OAuth
- per-user identity propagation
- audit logging
- confirmation gates for destructive actions

## Compatibility With ChatGPT Custom

The intended consumer is a custom GPT in ChatGPT using a remote MCP connector. The deployed MCP route should therefore:

- use a public HTTPS URL
- live on the production Vercel domain or mapped custom domain
- expose a stable route such as `/api/mcp`
- avoid repo-specific or dev-only assumptions in the transport layer

## Documentation Deliverables

The implementation should leave behind:

- a runbook for the MCP surface and environment variables
- a short connection guide for ChatGPT custom setup
- notes about the intentionally open access model in this first version

## Verification

The work should be verified through:

- unit tests for admin service behavior
- source/contract tests for MCP tool registration and route export shape
- `npm run typecheck`
- `npm test`
- `npm run build`

If the MCP transport library makes full protocol integration tests cumbersome in the first pass, the minimum acceptable test strategy is:

- service-layer behavior tests
- route-level source checks
- successful production build verification

## Risks

### Open access risk

This is the biggest intentional tradeoff. The route is designed for fast testing, not for safe multi-user exposure.

### Service-role blast radius

The repo uses the Supabase service role on the server. That makes it especially important that MCP exposes only scoped tools.

### Drift risk

If route handlers and MCP tools do not share the same admin services, behavior will diverge quickly.

### Transport compatibility risk

MCP support in ChatGPT and transport adapters changes over time, so the implementation should stay close to current handler and SDK conventions and avoid custom protocol logic.

## Success Criteria

The feature is successful when:

- the deployed app serves a working MCP endpoint from the same Vercel project
- ChatGPT custom can connect to it as a remote MCP server
- ChatGPT can list and mutate the admin data surface using the MCP tools
- the repository includes a durable setup guide for the user to reconnect the custom GPT later
