# Map Runbook

## Superficie Principal

- UI principal: `components/map/map-view.tsx`
- Layout y cámara: `lib/map/*`
- Transiciones: `components/layout/map-transition-*`

## Riesgos

- Cualquier cambio puede romper viewport, foco, panel lateral o loaders.
- La experiencia visual importa más que una refactorización interna bonita.
- Varias pruebas existentes validan partes geométricas y de transición, pero no reemplazan validación real en navegador.

## Validación Recomendada

- `npm run typecheck`
- `npm test`
- `npm run e2e -- --grep "mapa|smoke"`

## Señal De Alerta

Si el cambio aumenta más lógica dentro de `components/map/map-view.tsx`, conviene evaluar extracción antes de seguir agregando responsabilidades.
