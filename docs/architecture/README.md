# Architecture Overview

## Superficie Del Producto

La app es un planificador privado para Ingeniería en Informática FIUBA con cuatro dominios principales:

- `dashboard/agenda`: resumen académico, agenda, vistas semanales y evaluaciones
- `map`: mapa interactivo de correlatividades y navegación asociada
- `chat/ai`: Synapse, proveedores AI y acciones admin asistidas
- `admin/data`: gestión de cuatrimestres, materias, cursadas y eventos

## Estructura Actual

- `app/`: rutas App Router y API routes
- `components/`: UI por dominio y layout compartido
- `lib/`: lógica de dominio, integraciones, queries y utilidades
- `tests/`: pruebas unitarias, source tests y guardrails ligeros
- `supabase/`: config y migrations

## Invariantes Importantes

- El mapa y sus transiciones deben sentirse estables y no degradar la navegación.
- El dashboard, agenda y admin comparten datos académicos; un cambio de modelo impacta varias superficies.
- El chat puede derivar en acciones admin, por lo que mezcla UI, validación, proveedores y mutación de datos.
- Las integraciones con Supabase y Google Calendar no son simuladas por defecto; pueden tocar datos reales.

## Validación Recomendada

- Cambios visuales o de navegación: `npm run harness:smoke`
- Cambios de dominio o lógica: `npm run typecheck`, `npm test`
- Cambios de integración o entrega: `npm run verify`

## Hotspots

Ver [hotspots.md](/home/juan/Proyectos/web/Pagina%20ing%20informatica/docs/architecture/hotspots.md).
