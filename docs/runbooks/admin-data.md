# Admin And Data Runbook

## Superficie Principal

- Admin UI: `app/(app)/admin/page.tsx` y `components/dashboard/*manager*.tsx`
- Rutas API: `app/api/subjects/*`, `app/api/terms/*`, `app/api/enrollments/*`, `app/api/events/*`
- Casos de uso y schemas: `modules/academic/application/*` y `modules/academic/domain/*`
- Persistencia: `modules/academic/adapters/supabase-*`; composición: `modules/academic/server.ts`
- `lib/admin/*` conserva los imports públicos para HTTP, MCP y GPT Actions.

## Riesgos

- Cambios aquí pueden modificar datos base de la carrera.
- El modo demo entra como admin y permite recorrer flujos reales.
- Varios managers ya son grandes y mezclan UI con lógica de mutación.

## Validación Recomendada

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e -- --grep "admin|smoke"`
