# Planificar como workspace de escenarios

## Objetivo

Convertir `/planificar` en un espacio de trabajo para comparar alternativas de cursada por período sin alterar el shell, la navegación, el fondo ni la identidad oscura de la aplicación. La planificación permanece separada de las cursadas reales hasta que el usuario confirma un escenario.

## Tesis visual

Un tablero académico oscuro, amplio y operativo: una barra compacta orienta, la semana ocupa la mayor superficie y un inspector lateral aporta contexto sin competir con la grilla.

## Plan de contenido

1. Barra compacta: período, escenarios, métricas, importar oferta y confirmar.
2. Grilla protagonista: lunes a sábado, horas, bloques académicos y actividades personales.
3. Inspector: selecciones del escenario, comisión, color, carga y acciones.
4. Superficies temporales: añadir materia, importar/cargar oferta, crear actividad y alinear antes de confirmar.

## Tesis de interacción

- Cambiar de pestaña reemplaza la grilla y el inspector con una transición contenida.
- Seleccionar o arrastrar sobre una zona vacía crea una actividad con día y horario precargados.
- Contraer el inspector ensancha la grilla; los menús de escenario aparecen solo bajo demanda.

## Modelo de dominio

Se mantienen separados cuatro conceptos:

- `subjects`: materia estructural del plan académico.
- `planner_offers`: oferta compartida de un período; una comisión puede tener varios bloques.
- `planner_scenarios`: alternativa de planificación para un período.
- `planner_selections`: materia o actividad elegida dentro de un escenario.

Una selección de materia puede vincular cero, una o varias filas de oferta mediante una relación propia. Conserva un snapshot legible, color y todos sus bloques horarios. Una selección personal usa el mismo contrato de grilla, pero no crea una materia ni una cursada.

Los registros legacy de `planner_entries` se migran a un escenario inicial `Plan A` sin destruir la tabla anterior en esta entrega.

## Estados académicos

Los estados persistidos de `enrollments` siguen siendo `cursando`, `final_pendiente`, `aprobado` y `recursar`. `Disponible` y `Bloqueada` son estados derivados:

- aprobada o final pendiente: último estado real;
- cursando: cursada activa/relevante;
- disponible: no aprobada y requisitos satisfechos;
- bloqueada: al menos un requisito obligatorio no aprobado;
- recursar: se conserva cuando sea el último estado real.

El selector prioriza disponibles, reduce el protagonismo de aprobadas y explica brevemente el bloqueo.

## Escenarios

- Todo período comienza con `Plan A` si todavía no tiene escenarios.
- Se pueden crear, renombrar, duplicar, vaciar y eliminar escenarios.
- La oferta es común al período; las selecciones son exclusivas de cada escenario.
- Debe existir al menos un escenario: al eliminar el último se recrea uno vacío o la acción se bloquea claramente.
- Cambiar escenario nunca mezcla selecciones ni actividades.

## Oferta y selecciones

- La oferta se puede importar con el parser FIUBA existente y cargar manualmente.
- Una selección admite varios bloques y varias comisiones/secciones vinculadas.
- Añadir manualmente una materia no presente en la oferta crea una selección externa/no resuelta; no modifica Cursos todavía.
- Los colores se asignan automáticamente desde una paleta sobria y pueden editarse. Todos los bloques de una selección comparten color.

## Actividades personales

- Se crean seleccionando directamente una zona vacía de la grilla.
- El flujo recibe día, inicio y fin desde la selección y permite editar título, tipo, lugar/notas y color.
- Se distinguen visualmente mediante tratamiento y etiqueta sutil, no con una tarjeta o botón permanente dentro de la grilla.

## Confirmación y alineación

`Confirmar plan` abre la revisión final únicamente para las materias elegidas. Cada selección se resuelve como:

- vinculada a una materia existente;
- nueva materia creada en Cursos;
- externa/no vinculada.

La confirmación es transaccional: crea o actualiza `enrollments` solo para selecciones vinculadas o creadas, copia color y horario consolidado, conserva la trazabilidad en la selección y marca el escenario como confirmado. Las actividades personales y las materias externas permanecen en el escenario pero no generan enrollment.

## Cursos y Mapa

- Alta y edición de materias usan el inspector derecho inline; Papelera y confirmaciones destructivas pueden seguir como diálogos.
- `Requiere` muestra períodos anteriores y `Habilita` períodos posteriores.
- Sin período sugerido se permite seleccionar cualquier materia no idéntica, con orientación visible.
- Relaciones existentes que queden fuera de orden se mantienen visibles con advertencia para poder retirarlas; nunca se borran automáticamente.
- La única fuente relacional continúa siendo `subject_prerequisites`; Mapa consume esa base y `term_suggested`/`term_order` sin rediseño visual.

## Responsive

- Menos de 640 px: un día visible; inspector y formularios como superficie temporal.
- 640–1023 px: tres días visibles.
- Desde 1024 px: seis días de planificación; el inspector puede apilarse si el ancho no alcanza.
- Desde 1280 px: inspector lateral colapsable.
- No debe aparecer overflow horizontal del documento.

## Criterios de aceptación

- Escenarios independientes con crear, renombrar, duplicar, vaciar y eliminar.
- Oferta importada/manual compartida por período.
- Selecciones con múltiples bloques y múltiples comisiones.
- Añadir materias priorizando disponibilidad y explicando bloqueos.
- Actividad personal creada desde una selección en la grilla y con color editable.
- Colores automáticos coherentes y editables.
- Métricas de materias, horas y cruces correctas por escenario.
- Confirmación con alineación existing/create/external y enrollments reales solo al final.
- Cursos crea/edita inline y filtra relaciones por período sin pérdida silenciosa.
- Mapa sigue reflejando períodos y correlativas desde la fuente única.
- Tipos, lint, tests, build, navegador y deployment de producción verificados.
