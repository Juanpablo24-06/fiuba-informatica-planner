# Cursos como plan académico editable

## Objetivo

Convertir `/cursos` en el explorador y editor principal de las materias estructurales del plan, manteniendo `/mapa` como una representación de esos mismos datos. La implementación debe preservar el catálogo, las correlatividades y las cursadas existentes.

## Modelo

La solución mantiene tres conceptos separados:

- `subjects`: identidad y estructura de una materia.
- `enrollments`: instancia de cursada y fuente actual de la situación académica personal.
- `subject_prerequisites`: relación dirigida única donde `subject_id` requiere `prerequisite_id`.

`subjects` incorpora:

- `description`: descripción opcional.
- `term_order`: orden opcional dentro del período sugerido.
- `evaluation_info`: régimen o información general de evaluación.
- `notes`: notas generales de la materia.
- `useful_links`: lista JSON de pares `{ label, url }`.
- `custom_fields`: lista JSON de pares `{ label, value }`.
- `deleted_at`: marca de borrado lógico.

Se conservan `requirements` y `template` para no perder compatibilidad con los datos y consumidores actuales. El nombre continúa siendo obligatorio; código, ubicación, clasificación y cargas son opcionales.

## Relaciones

La interfaz puede editar tanto requisitos como materias habilitadas, pero ambas vistas escriben sobre `subject_prerequisites`. La actualización de ambas direcciones debe ser una sola operación transaccional, sin duplicados ni autorrelaciones.

Archivar una materia no elimina sus relaciones, cursadas ni eventos. Las lecturas normales excluyen materias archivadas; la Papelera usa una lectura explícita y restaurar quita `deleted_at`.

## Experiencia

### Tesis visual

Un workspace académico oscuro, sobrio y denso pero legible, organizado con tipografía, aire, columnas y separadores antes que contenedores.

### Plan de contenido

- Explorador izquierdo: búsqueda, filtros, orden, grupos por período y accesos a Nueva materia y Papelera.
- Inspector: identidad y ubicación primero; luego `Tu situación`; después requisitos, materias habilitadas e información adicional.
- Formulario progresivo: información básica, ubicación, carga, relaciones e información adicional.
- Papelera: lista breve de materias archivadas con restauración directa.

### Tesis de interacción

- Transición contenida al abrir el formulario o la Papelera mediante el diálogo existente.
- Selección de relaciones con búsqueda y estados claros, sin una nube de cápsulas.
- Actualización inmediata del explorador tras crear, editar, archivar o restaurar; Mapa refleja la misma fuente al volver a cargar o navegar.

## Mapa

- La columna sigue derivándose de `term_suggested`.
- `term_order` pasa a ser la prioridad de orden dentro de una columna.
- Las reglas de posición FIUBA existentes quedan solo como fallback para datos sin orden explícito.
- Las aristas visibles derivan exclusivamente de `subject_prerequisites`.
- Las materias archivadas no se consultan ni se representan.
- No se rediseñan el lienzo, la cámara, los nodos ni las transiciones.

## Compatibilidad y migración

La migración es aditiva. Inicializa `term_order` de los registros actuales de forma determinista por período y nombre, añade restricciones seguras para JSON/autorrelaciones e índices para lecturas activas y Papelera. No modifica estados, cursadas, eventos ni las correlatividades existentes.

Estado remoto observado antes de implementar: 56 materias, 71 correlatividades, 7 cursadas, 3 períodos y 0 eventos; no se encontraron autorrelaciones, huérfanos ni duplicados. Las migraciones remotas `001`–`007` están alineadas con el repositorio.

## Criterios de aceptación

- Crear y editar todos los campos definidos desde Cursos.
- Editar requisitos y habilitadas usando una única relación persistida.
- Archivar, ocultar de Cursos/Mapa, listar en Papelera y restaurar sin pérdida.
- Mantener claramente separadas la estructura de la materia y `Tu situación`.
- Posicionar Mapa por período y orden estructurales sin otra fuente de correlatividades.
- Mantener búsqueda, filtros, ordenamiento y comportamiento responsive.
- Validar tipos, lint, tests, build y flujos de navegador relevantes antes de publicar.
