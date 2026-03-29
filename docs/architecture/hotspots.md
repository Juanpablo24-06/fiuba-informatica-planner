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
- `app/api/chat/route.ts`
  - Une validación, contexto, proveedor AI, persistencia y ejecución de acciones.
- `lib/ai/admin-actions.ts`
  - Contiene reglas de mutación y normalización sensibles para datos reales.

## Regla Práctica

Si tocás uno de estos archivos:

- no asumas que el cambio es aislado
- corré validación de navegador si afecta UI
- corré `typecheck`, `test` y `build` si afecta contratos o integraciones
- preferí extraer lógica en vez de seguir engordando el hotspot
