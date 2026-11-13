# Planificar

Primera versión del espacio unificado de cursada.

## Decisiones

- `Planificar` vive después de Cursos y se dedica a construir el horario recurrente.
- `Calendario` ocupa la antigua posición de Agenda y ofrece Semana/Mes con fechas reales.
- Las rutas `/agenda/semana` y `/agenda/evaluaciones` se conservan para compatibilidad.
- Las comisiones importadas desde FIUBA pasan por vista previa. Las líneas que no se entienden quedan marcadas para revisión y no se guardan automáticamente.
- Los cambios de horario se modelan como períodos (`effective_from`/`effective_to`) para conservar el historial.
- La selección de cuatrimestre es obligatoria y queda recordada en el navegador.
- El plan y su historial se persisten con `006_planner_entries.sql`; el catálogo importado de comisiones usa `007_planner_offers.sql`.
- Synapse recibe el plan activo y, cuando la consulta lo requiere, las comisiones relacionadas. Con permiso admin puede cambiar una comisión o quitar una materia conservando el historial anterior.

## Importación FIUBA

El parser consume el texto plano copiado desde “Oferta de comisiones”: actividad, código, comisión, cupo, instancia, docentes y filas de tipo de clase/día/horario/aula. El usuario confirma el resultado antes de asociar una comisión a su plan.
