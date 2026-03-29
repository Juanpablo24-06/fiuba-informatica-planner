# Agenda And Calendar Runbook

## Superficie Principal

- Rutas: `app/(app)/agenda/*`
- Componentes: `components/dashboard/weekly-schedule.tsx`, `components/dashboard/monthly-schedule.tsx`
- Integración: `lib/google-calendar.ts`
- Sync API: `app/api/calendar/sync/route.ts`, `app/api/calendar/sync-provider/route.ts`

## Riesgos

- Puede mezclar eventos internos, horarios de cursada y Google Calendar.
- Los flujos de sync pueden tocar datos reales y cache.
- Las vistas semanal y de evaluaciones son parte del smoke browser harness.

## Validación Recomendada

- `npm run typecheck`
- `npm test`
- `npm run e2e -- --grep "agenda|evaluaciones|smoke"`
