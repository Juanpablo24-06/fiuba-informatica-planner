# Sección Cursos

## Propósito

`/cursos` es el catálogo operativo del plan de Ingeniería en Informática. Complementa el resumen y el mapa: el resumen muestra avance general, el mapa muestra la red de correlatividades y Cursos permite buscar, comparar, inspeccionar y administrar cada materia.

## Fuente de datos

- `subjects`: identidad y datos curriculares de la materia.
- `subject_prerequisites`: relaciones formales de correlatividad.
- `enrollments`: estado real de la materia en los cuatrimestres cursados.
- `events`: evaluaciones y actividades del cuatrimestre actual.
- `Datos/RESCD_2023_526_Informatica_Plan_2023_Aprobacion_15d3cee700_6e3b075bd4.pdf`: referencia del plan, carga horaria, estructura y distribución curricular.

La interfaz distingue datos oficiales del plan de datos personales de cursada. No convierte estimaciones de evaluación del informe en hechos curriculares.

## Modelo de lectura

Cada curso expone una identidad estable (`subject.id`) y:

- metadatos curriculares: código, tipo, ciclo, cuatrimestre sugerido, créditos y horas;
- estado personal: disponible, cursando, aprobada, final pendiente o recursar;
- correlativas requeridas y cursos que desbloquea;
- plantilla de evaluación y requisitos generales cargados;
- cursada actual, horario, notas y eventos cuando existen.

Esto permite que una futura herramienta de IA lea el mismo objeto y solicite mutaciones por ID, sin depender de texto visual o de nombres ambiguos.

## Interacción

- búsqueda por nombre o código;
- filtros `Todos`, `Cursando`, `Aprobadas`, `Disponibles`, `CBC` y `Electivas`;
- orden por recorrido, nombre o carga; solo el recorrido del plan agrupa por cuatrimestre;
- selección de curso sin perder el contexto de la lista;
- enlaces internos a correlativas y cursos desbloqueados;
- edición admin de datos curriculares y correlativas mediante APIs validadas.

## Decisiones visuales

- La navegación queda `Resumen | Mapa | Cursos | Agenda | Admin`.
- La pantalla comienza directamente con la superficie de trabajo: controles a la izquierda e inspector alineado arriba.
- La lista es una secuencia con grupos por cuatrimestre, no una cuadrícula de tarjetas.
- La búsqueda y la lista quedan sticky en desktop con scroll propio mientras se lee el inspector.
- Los `Select` comparten un desplegable visual propio, con selección marcada, foco, hover y superficie coherente con la aplicación.
- El inspector es una sola superficie de trabajo; sus bloques internos usan líneas, columnas y aire.
- En móvil la lista precede al inspector y conserva el curso seleccionado.
