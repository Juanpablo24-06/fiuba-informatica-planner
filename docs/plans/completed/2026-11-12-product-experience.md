# FIUBA Plan: experiencia y consistencia

## Objetivo
Evolucionar la identidad existente y publicar la demo de Sites con navegación fluida, preferencias persistentes, perfiles claros y flujos académicos coherentes. Conservar datos locales y trabajo previo; ninguna conexión de IA o acceso a servicios privados.

## Alcance y validación
- [x] Inspeccionar y reproducir calendario, mapa, cursos, planificación y preferencias.
- [x] Corregir rutas antiguas, estado inicial del calendario y persistencia/sincronización.
- [x] Corregir distribución estructural CBC y verificar geometría.
- [x] Refinar movimiento, temas, acceso y Perfil; restaurar Synapse sin proveedor.
- [x] Probar flujos desktop/móvil, teclado, reduced-motion, errores y almacenamiento.
- [x] Ejecutar tipos, pruebas dirigidas y build; publicar misma URL y audiencia.

Los componentes compartidos se corrigen en el proyecto principal y se sincronizan selectivamente con la demo. Los adaptadores y el selector sin contraseña pertenecen a la demo. La selección de roles cambia permisos sobre el mismo recorrido ficticio, no representa cuentas distintas.

## Hallazgos confirmados
- El tema inicial usa `system`; la demo aplica preferencias después de cargar el módulo.
- El bloqueo global de tema cancela animaciones CSS y las reinicia; los íconos responden a hover, foco, click y activación.
- Resumen enlaza `Ver horario` a la agenda semanal antigua.
- Calendario abre automáticamente el selector de cuatrimestre aunque ya haya uno actual.
- La semilla impone `term_order` global y el mapa pierde la distribución CBC por cuatrimestre.

## Resultado
Terminado y publicado el 13/11/2026: Sites versión 4, commit 0fa305a7772ff573b4721887fcca93cfdebfe0f6. URL: https://fiuba-plan-demo.stillfudge8.chatgpt.site. Audiencia pública, sin túneles ni variables de entorno.

## Refinamiento final solicitado
- Recuperar las animaciones por partes de los íconos, ahora 620–860 ms con amplitud contenida y sin reinicios por hover/foco/clic consecutivos.
- Recuperar 720 ms mínimos de carga entre secciones y al confirmar el ingreso; movimiento reducido omite ese mínimo.
- Conservar exactamente el loader del mapa anterior; usar su trazado como ilustración fija en el inicio y quitar el texto redundante.
- Selector claro/oscuro y cuatro paletas entre perfiles y confirmación, con persistencia existente.
- Normalizar la barra final de rutas de Sites para conservar la sección al recargar.
- El usuario solicita no usar navegador: esta revisión se valida con pruebas de componentes/datos, tipos, lint, build y comprobaciones HTTP. La revisión visual anterior no cubre estos últimos ajustes.
- Último ajuste: onda de tema también en el selector de entrada; formulario más ancho y compacto, tema/paleta en una fila y variantes para pantallas de poca altura. Mantener contenido accesible sin ocultar desbordamientos con recortes.

## Ampliación: propagación de tema
- Fondo decorativo capturado a partir de su geometría y colores reales; máscara orgánica con borde suave, 480 ms. Nunca se captura ni duplica el contenido interactivo.
- Superficies con transición independiente y desplazamiento transitorio de 1.5 px; barra estable. Segundo clic retoma el fondo visible; guardado inmediato y limpieza en scroll, resize, movimiento reducido y navegación.
- Validación: ambos sentidos, origen exacto, clics rápidos, teclado, persistencia, capas, escritorio/móvil y capturas intermedias.
- Ajuste solicitado: sin tratamiento especial de letras. Se conserva el cambio de color habitual del texto; la propagación afecta solo al fondo decorativo.

## Evidencia final
- Primera fase: 104 pruebas dirigidas del proyecto, 7 pruebas de demo y recorridos de navegador local en escritorio/móvil.
- Refinamiento final: 36 pruebas dirigidas de layout/transiciones y 10 de demo, tipos en ambos proyectos, lint dirigido y build estático correctos.
- El loader del mapa coincide con la versión anterior; el dibujo de entrada es estático. Se probaron persistencia de opciones, ciclo de animaciones y normalización de rutas sin navegador.
- La verificación pública anterior detectó el sufijo / en rutas de Sites. Corregido en el adaptador y cubierto con pruebas de normalización; las rutas públicas sirven el build nuevo por HTTP.
- No se repitió QA de navegador para el último refinamiento, por indicación expresa del usuario. No se verificó visualmente el encaje final en todos los tamaños.
