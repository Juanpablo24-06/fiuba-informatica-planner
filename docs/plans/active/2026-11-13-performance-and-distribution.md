# Rendimiento y distribución de FIUBA Plan

## Objetivo
Optimizar mapa, entrada y onda de tema conservando identidad, loaders e interacciones aprobadas. Publicar el código completo en los repositorios privado y público, con demo aislada y modalidad normal protegida seleccionables por configuración. Actualizar Sites con la demo optimizada.

## Criterios de aceptación
- La cámara no renderiza nuevamente el grafo ni escribe almacenamiento en cada evento de movimiento.
- El mapa se mide detrás del loader y aparece suavemente después de tener una cámara válida.
- La mancha de tema conserva su forma y usa trabajo gráfico acotado; ambos accesos comparten el mismo efecto.
- El arranque demo no usa credenciales ni servicios reales; el modo normal conserva autenticación y APIs.
- Ambos repositorios contienen las dos modalidades, documentación reproducible y muestras de configuración sin secretos.
- Mantener historial público saneado, licencia y atribuciones. Excluir datos privados, entorno, caches, capturas y vínculos al repositorio Sites.

## Plan
- [x] Diagnosticar costos y registrar medidas reproducibles.
- [x] Optimizar tema, cámara, revelado y carga de módulos.
- [x] Integrar las dos modalidades por configuración y documentarlas.
- [x] Verificar tipos, lint, pruebas y builds; revisar exposición de datos.
- [ ] Publicar repositorios y demo de Sites; verificar referencias y entrega.

## Restricciones
Se conserva la indicación previa de no usar navegador; la verificación de esta iteración emplea pruebas automatizadas sin navegador, mediciones dirigidas, builds y HTTP. No configurar proveedores de IA ni conectar la demo a la computadora o servicios privados. No eliminar trabajo local previo.

## Diagnóstico inicial
- La cámara almacena transformaciones en estado React y localStorage por cada movimiento: vuelve a recorrer nodos y conexiones.
- El contenedor del mapa usa display:none durante la carga, impidiendo medir la cámara hasta retirar el loader; la señal onReady solo considera el layout del grafo.
- La onda usa cuatro canvas y dibuja 24 polígonos de 96 puntos por fotograma, además de repintar la escena completa.
- La demo importa todas las páginas de forma inmediata, incluyendo mapa, administración y planificación antes de elegir perfil.

## Repositorios verificados
- Privado: Juanpablo24-06/Pagina-de-ing-informatica.
- Público: Juanpablo24-06/fiuba-informatica-planner (copia local limpia, historial independiente saneado).

## Implementación y medidas
- Cámara fuera del estado React: coalescencia por frame, guardado 200 ms después de la última interacción y flush al salir. Prueba con Profiler: 20 eventos de zoom, cero renders adicionales del grafo y una escritura de cámara. La señal ready requiere dimensiones válidas y cámara pintada.
- El contenedor detrás del loader conserva geometría, queda inerte y el mapa aparece con opacidad de 300 ms. Se mantienen el loader original y el mínimo intencional de navegación de 720 ms.
- Fondo con escenas prerenderizadas y máscara orgánica cacheada. Tres composiciones por frame; límite de un millón de píxeles por capa. El texto no recibe animación nueva. Se elimina el desplazamiento del dibujo de fondo para evitar repintarlo; las superficies conservan la reacción sutil.
- Benchmark Canvas nativo, 6 ondas de 30 frames por variante: a 1280×720, mediana 63.54 → 9.28 ms; a 390×844, 20.82 → 4.06 ms. Mide rasterizado local, no FPS de navegador. Prueba de píxeles en ambos sentidos y al interrumpir: origen, propagación, opacidad e igualdad exacta del fotograma retomado correctos.
- Demo con imports por ruta: entrada 673.73 → 405.35 kB; gzip 195.98 → 126.39 kB. Mapa, planificación, cursos y administración se descargan al necesitarlos.
- Paquete autónomo `apps/demo`, selección APP_MODE y scripts explícitos; credenciales filtradas del entorno demo, sin carga de `.env` por Vite. Acceso de desarrollo normal desactivado por defecto y siempre bloqueado en producción.
- Enlace de Synapse y entrada apunta al repositorio público verificado. Fuentes locales con licencias OFL en ambas distribuciones; resuelve el fallo de Google Fonts en builds limpios.
- Auditoría inicial: 27 alertas, incluida una crítica de Next.js. Actualización compatible y override acotado de minimatch en el linter: auditoría final sin vulnerabilidades reportadas.

## Verificación
- Suite previa a la actualización de dependencias: 308 pruebas y una prueba adicional de renderizado del mapa correctas; tipos, lint y build normal correctos.
- Demo: 10 pruebas de datos, permisos, persistencia, rutas y aislamiento; tipos y build correctos. Sitio publicado con la optimización, sin MCP ni túneles.
- La copia pública se prepara con una lista de código y configuración, conserva licencia/atribuciones e historial independiente. Escaneo de firmas de credenciales y coincidencias con valores de entorno locales sin hallazgos; PDFs, entornos, respaldos y metadatos de hosting excluidos.
- Verificación final: 313 pruebas (94 archivos), typecheck, lint y build normal con Next 16.4.6 correctos. Demo: 10 pruebas, tipos y build correctos también desde una instalación limpia del repositorio público. Cero alertas de npm audit en ambos paquetes. Sites versión 6 publicada; HTTP 200 en acceso, mapa y calendario con el bundle nuevo. La comprobación visual en navegador queda pendiente por indicación expresa del usuario.