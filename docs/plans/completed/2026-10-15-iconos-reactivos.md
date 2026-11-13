# Iconos que responden a las acciones

Objetivo: dar una respuesta breve y reconocible a todos los iconos de la barra superior y al cambio de mes del calendario, conservando la identidad visual y los flujos existentes.

## Alcance y criterio

- Calendario: desprender una hoja al entrar y al cambiar de mes (flechas principales, mini calendario o cualquier selección que cambie el mes), con dirección según avance o retroceso. Cambiar de día dentro del mismo mes no dispara el gesto.
- Resumen: pulso escalonado de sus cuatro bloques. Mapa: movimiento del pin. Cursos: inclinación de un libro. Planificar: desplazamiento de controles. Admin: giro breve del engranaje.
- Tema: entrada y giro breve del sol/luna al cambiar. Perfil: pequeño gesto de la cabeza y flecha que refleja apertura. Marca: separación de los símbolos de código al pasar el puntero.
- Responder a hover, foco, clic y activación; sin bucles en reposo ni esperas para navegar.
- Usar Web Animations nativo para partes SVG; cancelar al repetir, desmontar o activar movimiento reducido. Sin dependencia nueva.
- Conservar datos, tipografía, colores, dimensiones y navegación. No extender esta pasada al resto de la app.
- La señal `data-workspace-ready` del calendario debe emitirse después de hidratar, para que la QA interactúe cuando los controles estén conectados.
- Pedido posterior: dejar una vista pública temporal del servidor local; ver `docs/specs/2026-10-15-vista-publica-local.md`.

## Validación

- [x] Implementar iconos y conexión con el calendario.
- [x] Revisar tipos, lint y diff.
- [x] Ejecutar browser harness y casos dirigidos: avance/retroceso, repetición rápida, teclado, móvil y movimiento reducido.
- [x] Inspeccionar capturas representativas del gesto y estado final.
- [x] Dejar servidor local y túnel activos y verificar HTTPS público.

## Resultado y límites

- `npm run typecheck`, `npm run lint`, lint dirigido final y `git diff --check`: correctos. Pruebas de layout: 11 archivos y 22 casos correctos.
- Casos dirigidos de Playwright: gestos en escritorio/móvil, dirección, repetición, foco, tema y perfil correctos; movimiento reducido y cambio de preferencia en caliente correctos. Se ejecutaron en pasadas separadas con Webpack y el aislamiento del harness original.
- El arranque estándar con Turbopack falló al resolver Google Fonts. Se usó una configuración temporal de QA con Webpack, eliminada al terminar.
- El smoke general se inició pero no se completó: el caso de Resumen falló porque una tarjeta de curso siguió deshabilitada durante 30 segundos. No se ejecutó una comparación contra una base limpia, dado que el checkout ya tenía cambios locales extensos. No se declara validada toda la navegación.
- Se comprobó la composición de la barra en capturas de escritorio y móvil. No se animan otros iconos del contenido.
- Vista pública: `/login` respondió 200, cuatro scripts cargaron sin errores, no hubo errores JavaScript y `/api/auth/demo` respondió 404. Se conserva el login habitual. Los procesos y logs quedan fuera del repositorio, según la spec.
