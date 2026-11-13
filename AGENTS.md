# AGENTS.md

Este repositorio usa `README.md` para onboarding humano y este archivo como índice operativo para agentes.

## Runtime

- Usar `Node.js 20+`
- Antes de cambios grandes o multiárea, leer [docs/README.md](docs/README.md)

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

- Mapa general del repo: [docs/README.md](docs/README.md)
- Arquitectura e invariantes: [docs/architecture/README.md](docs/architecture/README.md)
- Hotspots: [docs/architecture/hotspots.md](docs/architecture/hotspots.md)
- Runbooks: [docs/runbooks/README.md](docs/runbooks/README.md)
- MCP/ChatGPT custom: [docs/runbooks/mcp-chatgpt.md](docs/runbooks/mcp-chatgpt.md)

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

## Identidad visual y movimiento

- Respetá la identidad visual actual del proyecto; antes de modificar UI/UX estudiá componentes, tipografía, colores, spacing, radios, sombras, densidad, jerarquía, tokens y patrones de interacción existentes.
- Reutilizá componentes, variables/tokens y patrones del sistema de diseño cuando tenga sentido. Una mejora visual no debe hacer que la aplicación parezca pertenecer a otro producto.
- Respetar el sistema de diseño no elimina la creatividad: podés mejorar composiciones, interacciones, feedback, movimiento y detalles cuando la propuesta sea coherente con el producto.
- Anime.js y cualquier otra herramienta deben reforzar el diseño existente, no imponer una identidad externa. Toda animación debe sentirse intencional y pertenecer al producto.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
