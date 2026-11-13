# Implementación: Cursos como plan editable

## Alcance acordado

Implementar el modelo estructural mutable de materias, relaciones bidireccionales sobre una sola tabla, Papelera y adaptación mínima de Mapa. No se rediseñan Mapa ni Planificar y no se crea todavía una configuración global de periodicidad o un modelo nuevo de identidad de usuario.

## Fases completadas

1. **Modelo y contratos**
   - Migración aditiva `008` con campos estructurales, orden y borrado lógico.
   - Tipos, consultas, validaciones, servicios admin y contratos AI/MCP actualizados.
   - Relaciones entrantes y salientes reemplazadas de forma transaccional sobre `subject_prerequisites`.

2. **Cursos**
   - Explorador con búsqueda, filtros, agrupación y orden.
   - Creación y edición progresiva, selectores de relaciones y validación estructurada.
   - Inspector reorganizado y Papelera con archivado/restauración sin pérdida.

3. **Mapa**
   - `term_order` incorporado al contrato y al layout.
   - Aristas derivadas exclusivamente de relaciones persistidas.
   - Materias archivadas excluidas y reglas FIUBA conservadas como fallback.

4. **Integración y entrega**
   - Migración remota aplicada tras dry-run y verificación de integridad.
   - Flujo autenticado de crear, editar, relacionar, archivar y restaurar validado en navegador con limpieza final.
   - `npm run verify`: tipos, lint, 204 pruebas y build correctos.
   - `npm run e2e -- --workers=1`: 16 pruebas correctas.

## Propiedad de archivos durante implementación

- Modelo: `supabase/migrations/008_*`, `lib/types.ts`, `lib/queries.ts`, `lib/query-mappers.ts`, `lib/admin/subjects.ts`, `app/api/subjects/**`, contratos admin/AI/MCP afectados y sus tests.
- Cursos: `app/(app)/cursos/page.tsx`, `components/dashboard/courses-explorer.tsx`, componentes bajo `components/courses/`, `lib/courses/catalog.ts` y tests de Cursos/UI.
- Mapa: `lib/map/**` y tests de Mapa.
- Coordinación: documentación, integración, Git, migración remota, despliegue y verificación final.

Ningún trabajador realizó commits, push, migraciones remotas ni despliegues.

## Resultado de las puertas de calidad

- Modelo: migración no destructiva y pruebas de contratos, relaciones y rutas correctas.
- UI: pruebas de lógica, validación responsive y recorrido real de navegador correctos.
- Mapa: pruebas de graph/layout correctas y reflejo de altas, orden, archivado y restauración verificado.
- Integración: diff limpio, `npm run verify` y E2E completos correctos.
- Producción: se verifica después del despliegue del commit final.
