# Demo pública aislada

Objetivo: publicar la interfaz existente en Sites con selección y confirmación de rol, datos ficticios y sin servicios reales.

- [x] Copiar únicamente la interfaz y sus dependencias puras, sin secretos, APIs ni adaptadores de producción.
- [x] Reemplazar acceso, consultas y mutaciones por almacenamiento del navegador; deshabilitar IA y Calendar.
- [x] Validar tipos, build, navegación, roles, edición persistente y ausencia de tráfico externo; revisar escritorio y móvil.
- [x] Publicar en Sites con acceso público y entregar URL.

La copia se compila como SPA estática con Vite. Reutiliza las páginas y componentes React del proyecto mediante adaptadores de navegación. No cambia la aplicación privada ni sus credenciales. Los cambios admin son individuales por navegador y pueden restablecerse.

Validado: tipos, build, 7 pruebas dirigidas y 11 comprobaciones de navegador (escritorio y móvil). Auditoría de privacidad: 7 valores sensibles locales contrastados, 0 coincidencias en el artefacto. Sin solicitudes de API por red ni solicitudes externas en el harness.

Publicado en Sites (acceso público), versión 1: https://fiuba-plan-demo.stillfudge8.chatgpt.site
