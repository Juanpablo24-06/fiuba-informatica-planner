# Hotspots

Estos archivos merecen especial cuidado porque concentran mucha lógica, estado o riesgo de regresión.

## Archivos Críticos

- `components/map/map-view.tsx`
  - Combina viewport, interacción, paneles y render del mapa.
- `components/dashboard/term-manager.tsx`
  - Administra bastante lógica de estado y edición de cuatrimestres.
- `components/dashboard/course-workspace-drawer.tsx`
  - Mezcla detalle de cursada, navegación y acciones.
- `components/dashboard/chat-panel.tsx`
  - Mezcla UI, estado conversacional, persistencia y activación de acciones.
- `modules/chat/application/chat.ts`
  - Coordina streaming, acciones autorizadas, conversación y memoria mediante puertos.
- `modules/chat/application/admin-actions.ts`
  - Interpreta acciones y delega las mutaciones a los servicios académico y de planificación.
- `modules/planning/application/scenarios.ts`
  - Coordina el ciclo de vida y las referencias de escenarios y selecciones.
- `modules/academic/application/*` y `modules/academic/adapters/supabase-*`
  - Las reglas compartidas y la persistencia afectan panel, MCP, GPT Actions y chat.

`app/api/chat/route.ts` y `lib/ai/admin-actions.ts` son entradas/fachadas; la implementación vive en los módulos.

## Regla Práctica

Si tocás uno de estos archivos:

- no asumas que el cambio es aislado
- corré validación de navegador si afecta UI
- corré `typecheck`, `test` y `build` si afecta contratos o integraciones
- preferí extraer lógica en vez de seguir engordando el hotspot
