# AGENTS.md

Este repositorio usa `README.md` para onboarding humano y este archivo como índice operativo para agentes.

## Runtime

- Usar `Node.js 20+`
- Antes de cambios grandes o multiárea, leer [docs/README.md](/home/juan/Proyectos/web/Pagina%20ing%20informatica/docs/README.md)

## Comandos Canónicos

- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run verify`
- `npm run e2e`
- `npm run e2e:headed`
- `npm run harness:smoke`

## Cuándo Escribir Docs

- Escribir spec en `docs/specs/` cuando haya cambio estructural, tooling nuevo, tradeoffs no obvios o trabajo que conviene revisar antes de codear.
- Escribir plan vivo en `docs/plans/active/` cuando el cambio toque varias áreas, tenga varias fases o necesite validación escalonada.
- Mover planes terminados a `docs/plans/completed/`.

## Dónde Leer Según La Tarea

- Mapa general del repo: [docs/README.md](/home/juan/Proyectos/web/Pagina%20ing%20informatica/docs/README.md)
- Arquitectura e invariantes: [docs/architecture/README.md](/home/juan/Proyectos/web/Pagina%20ing%20informatica/docs/architecture/README.md)
- Hotspots: [docs/architecture/hotspots.md](/home/juan/Proyectos/web/Pagina%20ing%20informatica/docs/architecture/hotspots.md)
- Runbooks: [docs/runbooks/README.md](/home/juan/Proyectos/web/Pagina%20ing%20informatica/docs/runbooks/README.md)
- MCP/ChatGPT custom: [docs/runbooks/mcp-chatgpt.md](/home/juan/Proyectos/web/Pagina%20ing%20informatica/docs/runbooks/mcp-chatgpt.md)

## Dominios Principales

- `dashboard/agenda`
- `map`
- `chat/ai`
- `admin/data`

## Hotspots Actuales

- `components/map/map-view.tsx`
- `components/dashboard/term-manager.tsx`
- `components/dashboard/course-workspace-drawer.tsx`
- `components/dashboard/chat-panel.tsx`
- `app/api/chat/route.ts`
- `lib/ai/admin-actions.ts`

## Reglas Prácticas

- No usar `docs/superpowers/*` como ubicación nueva por defecto. Esa ruta queda como legado.
- Si tocás navegación, loaders, mapa o chat, corré browser harness además de validación estática.
- Si tocás rutas API o flujos admin, verificá tipos, comportamiento y efectos visibles.
- Si tocás el endpoint MCP, corré al menos `npm test -- tests/mcp tests/admin`, `npm run typecheck` y `npm run build`.
- Preferí cambios pequeños y archivos enfocados cuando edites hotspots.
