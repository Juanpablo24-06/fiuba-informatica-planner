# Chat And AI Runbook

## Superficie Principal

- UI: `components/dashboard/chat-panel.tsx`
- Ruta: `app/api/chat/route.ts`
- Lógica AI: `lib/ai/*`
- Lógica de chat: `lib/chat/*`

## Riesgos

- Puede activar acciones admin reales.
- Mezcla contexto académico, proveedores AI y persistencia opcional.
- Tiene varias rutas de fallback y recuperación ante errores de proveedor.

## Antes De Cambiar

- Revisar `app/api/chat/route.ts` y `lib/ai/admin-actions.ts`
- Confirmar si el cambio toca solo presentación o también acciones/datos
- Revisar qué tests existentes cubren normalización, streaming y acciones

## Validación Recomendada

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e -- --grep "chat|admin"`
