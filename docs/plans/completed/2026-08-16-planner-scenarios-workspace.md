# Implementación: workspace de escenarios de Planificar

## Alcance

Evolucionar Planificar desde una selección única por período a escenarios persistentes, oferta compartida, actividades personales sobre la grilla y confirmación alineada con Cursos. Ajustar Cursos a edición inline y filtros de relaciones por período. No rediseñar shell, navegación, fondo, Calendario ni Mapa.

## Propiedad de archivos

### Modelo y contratos

- `supabase/migrations/009_*`
- `lib/planner/**`
- `app/api/planner/**`
- `app/(app)/planificar/page.tsx`
- pruebas unitarias y de rutas del dominio Planner

### UI de Planificar

- `components/planner/planner-workspace.tsx`
- `components/planner/planner-drawer.tsx`
- nuevos componentes `components/planner/planning-*`
- E2E de Planificar y responsive asociados

### Cursos

- `components/dashboard/courses-explorer.tsx`
- `components/courses/course-inspector.tsx`
- `components/courses/course-form.tsx`
- tests de Cursos y un E2E nuevo aislado para edición inline

El coordinador conserva documentación, integración, revisión general, migración remota, Git y despliegue. Ningún trabajador hace commit, push, db push ni deploy.

## Fases

1. Modelo aditivo y compatibilidad legacy.
2. APIs CRUD de escenarios/selecciones y confirmación transaccional.
3. Workspace visual, grilla interactiva, actividades, colores e inspector.
4. Cursos inline y filtrado temporal de relaciones.
5. Integración, revisión React/Next.js y validación escalonada.
6. Dry-run, migración remota, commit, push y despliegue verificado.

## Puertas de calidad

- Migración: dry-run, integridad y preservación de `planner_entries`/oferta/cursadas.
- Dominio: escenarios, duplicado, aislamiento, multi-oferta, conflictos, estados y confirmación.
- UI: desktop y breakpoints `390`, `768`, `1024`, `1280`, `1440`, `1920` sin overflow.
- Cursos: alta/edición no modal en desktop; relaciones filtradas y seleccionadas incompatibles visibles.
- Integración: `npm run verify`, E2E completo y flujo real de navegador con limpieza de datos temporales.
- Producción: migration aplicada antes del código, deployment `Ready`, URL pública y logs recientes limpios.

## Resultado

- Migración `009` aplicada de forma aditiva: 3 escenarios iniciales y 4 selecciones legacy migradas, sin alterar las 4 entradas legacy ni las 7 cursadas existentes.
- Planificar soporta escenarios persistentes, duplicado/renombrado/vaciado/eliminación, múltiples bloques y ofertas, actividades personales sobre la grilla, colores editables, estados académicos derivados y confirmación con alineación.
- Cursos crea y edita en el inspector inline; las relaciones se filtran por período manteniendo visibles las incompatibilidades preexistentes.
- Validación completada: tipos, lint, 222 pruebas unitarias/integración, build, 20 E2E y flujo real contra la base migrada con limpieza de datos temporales.
