# Supabase Runbook

## Ubicación

- Config: `supabase/config.toml`
- Migrations: `supabase/migrations/`
- Cliente admin: `lib/supabase-admin.ts`

## Regla

Si cambia el modelo de datos o la forma en que se consultan entidades académicas:

- revisar migrations existentes
- revisar impacto en `lib/queries.ts` y mappers asociados
- validar que dashboard, agenda, admin y chat sigan leyendo contratos compatibles

## Validación Recomendada

- `npm run typecheck`
- `npm test`
- `npm run build`
