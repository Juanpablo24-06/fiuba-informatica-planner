# Cursos: catálogo curricular e inspector editable

## Objetivo

Agregar una sección `/cursos` profunda y navegable para consultar el plan, correlatividades, evaluación y progreso personal, con edición admin preparada para futuras acciones de IA.

## Criterios de terminado

- Cursos aparece inmediatamente a la derecha de Mapa en desktop y mobile.
- La ruta carga datos reales de Supabase y no duplica el catálogo en la UI.
- La lista permite búsqueda, filtros y orden estable.
- El detalle expone carga, ciclo, cuatrimestre, tipo, correlativas, desbloqueos, evaluación y estado personal.
- Admin puede editar datos de la materia y sus correlativas mediante endpoints protegidos.
- El contrato de catálogo usa IDs estables y relaciones explícitas para futuras herramientas de IA.
- La UI mantiene el lenguaje visual actual sin convertir todo en tarjetas anidadas.
- Se valida con typecheck, lint, tests, build y browser harness.

## Datos del plan utilizados

La resolución del Plan 2023 indica 35 asignaturas estructurales, 226 créditos, 3616 horas y 10 cuatrimestres; el catálogo local contiene además la oferta electiva para explorarla por separado. La pantalla muestra estos datos como contexto, sin inventar créditos individuales del CBC cuando la fuente no los desglosa.

## Implementación

- Modelo puro `lib/courses/catalog.ts` para materias, estados, correlativas, desbloqueos, inscripción actual y eventos.
- Ruta `/cursos` y explorador client-side con búsqueda, filtros, orden, inspector y navegación relacional.
- Edición admin de metadatos y correlativas mediante `PATCH /api/subjects/[id]` y `PUT /api/subjects/[id]/prerequisites`.
- Atributos `data-ai-resource` e IDs estables preparados para una futura herramienta de IA.

## Validación

- 68 archivos de tests, 183 tests pasando.
- `npm run typecheck`, `npm run lint` y `npm run build` pasando.
- `npm run harness:smoke`: 4 pruebas de navegación pasando.
- Revisión visual de la nueva ruta en Chromium.
