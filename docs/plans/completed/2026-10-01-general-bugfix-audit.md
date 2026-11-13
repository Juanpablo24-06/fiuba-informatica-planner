# Revisión general de errores

## Objetivo

Encontrar y corregir errores reproducibles de configuración, lógica e interacción, conservando la identidad visual y los cambios locales previos. No migrar ni modificar datos reales para validar.

## Plan

1. Registrar el estado inicial y ejecutar tipos, lint y pruebas.
2. Revisar contratos sensibles y reproducir fallos con pruebas dirigidas.
3. Corregir las causas con cambios pequeños y comprobar regresiones.
4. Ejecutar build y harness de navegador; informar límites de integraciones externas.

## Estado

- Inicio: rama `codex/animejs-phase-1`; cambios previos en `.nvmrc`, `AGENTS.md`, `scripts/backup-supabase.sh`, `tsconfig.tsbuildinfo` y capturas locales.
- No existe `.codegraph/` en este checkout.
- Corregidos: filtro por cuatrimestre en API y dashboard, fechas y rangos de eventos/cuatrimestres (incluidos PATCH parciales), horarios invertidos, pérdida silenciosa de horarios en fallback, clasificación de errores de columna, validación y expiración de sesiones, destino inexistente al cambiar el cuatrimestre actual y contrato de versión Node desactualizado.
- Revisión terminada. Tipos, lint, build de producción y revisión del diff aprobados sobre los cambios finales con Node 22.
- La suite usaba JSDOM para pruebas de lógica y fallaba durante el arranque de workers. Ahora Node es el entorno por defecto y la prueba de preferencias conserva JSDOM explícitamente. No se necesitan matchers ni limpieza de DOM globales en las pruebas actuales.
- Las comprobaciones de persistencia usan un cliente simulado. La prueba E2E nueva envía únicamente payloads inválidos, rechazados antes de escribir datos.
- Pasaron los flujos E2E dirigidos de resumen, mapa, agenda y validación admin, además del caso de movimiento reducido. La comprobación final del resumen confirmó ausencia de errores de hidratación, apertura/cierre del diálogo y ausencia de mutaciones inline.
- Corregido el aviso de hidratación causado por estilos inline de la entrada de rutas. Se conserva el movimiento con efectos nativos. La tarjeta espera a tener sus manejadores listos antes de habilitar el clic.
- Las 256 pruebas unitarias pasaron entre ejecuciones completas y repeticiones dirigidas. No hubo una única ejecución completa totalmente verde: persistió un timeout intermitente de arranque de JSDOM; sus tres pruebas pasaron por separado. Los contratos de UI finales también pasaron (8 pruebas).
- Se conservaron los cambios previos y los datos reales. No se hicieron commits ni push. El servidor de desarrollo usado para la revisión fue detenido.
