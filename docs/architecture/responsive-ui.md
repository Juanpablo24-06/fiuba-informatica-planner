# Responsive UI

## Contrato De Layout

La aplicación usa un marco fluido, no un ancho fijo pensado para una captura concreta. El contenido normal puede crecer hasta `1680px`; Mapa conserva su lienzo completo. Los gutters deben usar escalas responsivas y nunca obligar a que un componente hijo compense con márgenes negativos.

## Breakpoints De Producto

- `< 640px`: móvil. Controles apilados, paneles como drawer y vistas temporales de un día.
- `640px–1023px`: tablet y ventana estrecha. Navegación compacta y vistas temporales de tres días.
- `1024px–1279px`: laptop compacta. Navegación completa y semana de siete días; inspectores pueden apilarse si no caben con calidad.
- `>= 1280px`: escritorio. Workspaces con inspector lateral.
- `>= 1536px`: monitor amplio. El marco sigue creciendo hasta `1680px` para aprovechar el espacio sin perder legibilidad.

Los breakpoints describen comportamiento, no tipos de dispositivo. Toda pantalla debe seguir funcionando al redimensionar la ventana y con alturas cortas.

## Reglas Para Cambios Futuros

1. No introducir `min-width` mayores al viewport para resolver calendarios, tablas o grids. Si la información es densa, reducir el rango visible o cambiar de representación.
2. El documento no debe tener overflow horizontal. Un scroll interno solo es válido cuando el contenido es naturalmente desplazable y tiene una pista visible en touch.
3. Los sidebars pasan a drawer o bottom sheet antes de dejar el workspace demasiado estrecho.
4. Usar `svh`/`dvh` para superficies que dependen de la altura y mantener un mínimo razonable con scroll interno.
5. Probar el intervalo entre breakpoints, especialmente el píxel exacto donde cambia la navegación.
6. Una pantalla “que no se rompe” no se considera responsive si la acción principal queda a miles de píxeles o requiere descubrir un scroll invisible.
7. Validar siempre `390x844`, `768x1024`, `1024x768`, `1280x720`, `1440x900` y un viewport de al menos `1920px`.

## Fuente De Verdad

- Shell y gutters: `components/layout/app-shell.tsx`
- Navegación: `components/layout/top-nav.tsx`
- Superficies temporales: `components/planner/planner-workspace.tsx`
- Calendario mensual: `components/planner/calendar-month-workspace.tsx`; mantiene el fondo global y concentra contexto, métricas, filtros y cuadrícula en una composición lateral responsive.
- Cursos: `components/dashboard/courses-explorer.tsx`
- Scroll global y touch: `app/globals.css`
- Regresión de navegador: `tests/e2e/responsive-layout.spec.ts`
