# Recuperar dashboard anterior

Objetivo: restaurar la presentación del dashboard previa a `7204afe` (base `7aba9ea`), que es el último cambio visual específico del resumen. Mantener datos, controles, accesibilidad y distribución responsive actuales, junto con los roles y aislamiento de la demo.

- [x] Restaurar la página del resumen y omitir su animación de entrada en la app y la copia Sites.
- [x] Ajustar los selectores del harness que dependían de los marcadores de animación retirados.
- [x] Validar tipos, diff, navegación y capturas de escritorio/móvil mediante la demo aislada.
- [x] Publicar la actualización en el mismo Site público.

No revertir commits completos, lógica de datos ni cambios locales ajenos. Referencia visual recuperada: título y progreso sin el panel translúcido, su borde ni el acento superior añadidos recientemente.

La demo Sites es un proyecto independiente en `sites/`. TypeScript y ESLint de la aplicación principal deben excluir esa carpeta; cada proyecto utiliza sus propias comprobaciones y alias. La validación detectó que el compilador principal estaba incluyendo 111 archivos de la demo y mezclando contratos y versiones de React.

Resultado: dashboard de 7aba9ea restaurado en la app y la demo; build y tipos de la demo correctos; harness de navegador con navegación, apertura de materias, roles, edición y móvil correcto. Sites versión 2 publicada en https://fiuba-plan-demo.stillfudge8.chatgpt.site .
