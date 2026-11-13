# Responsive Workspaces

## Objetivo

Hacer que la aplicación responda de forma deliberada al ancho y a la altura disponibles, desde móvil hasta monitores amplios, sin convertir vistas densas en lienzos de escritorio escondidos detrás de scroll horizontal.

## Reglas Aplicadas

- Marco de contenido fluido con límite amplio de `1680px` y gutters que crecen con el viewport.
- Navegación compacta por debajo de `1024px`; la navegación horizontal completa solo aparece cuando entra sin recortes.
- Calendario y planificador muestran 1 día en móvil, 3 días en tablet y 7 días desde laptop.
- Las vistas de tiempo usan altura dinámica del viewport y scroll interno vertical cuando es necesario.
- Los inspectores laterales se convierten en drawers o paneles completos en pantallas estrechas.
- Nunca se acepta overflow horizontal del documento como solución responsive.
- Los scrollbars internos siguen siendo visibles o descubribles en dispositivos táctiles.

## Validación Realizada

- Viewports comprobados: `390x844`, `768x1024`, `1024x768`, `1280x720`, `1440x900` y `1920x1080`.
- Rutas revisadas: Resumen, Cursos, Planificar, Calendario, Admin y chat.
- Browser E2E: 15 pruebas aprobadas con un solo worker.
- TypeScript, ESLint y build de producción aprobados.
- Suite unitaria completa aprobada.

## Estado

- [x] Shell y navegación
- [x] Resumen y Admin
- [x] Cursos móvil/tablet
- [x] Planificar y Calendario adaptativos
- [x] Chat y scroll táctil
- [x] Cobertura y validación
