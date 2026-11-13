# Vista pública temporal desde el equipo local

Pedido: permitir abrir los cambios desde cualquier conexión mientras el equipo y los procesos estén activos.

- Servidor Next.js local en `127.0.0.1:3000`, con Webpack por un fallo de resolución de Google Fonts en Turbopack durante esta validación.
- Túnel temporal de Cloudflare, sin servicio del sistema ni cambios de DNS. Ejecutable portable fuera del repositorio, en `%LOCALAPPDATA%/CodexPreview/`.
- Mantener el inicio de sesión normal. Ejecutar el servidor público con `DEMO_LOGIN_ENABLED=false`; el endpoint demo no debe crear sesiones admin desde el enlace público.
- `LOCAL_PREVIEW_HOST` permite únicamente el hostname temporal actual en `allowedDevOrigins`, para cargar recursos y conectar el cliente de desarrollo. Sin esa variable, la configuración no añade orígenes.
- Logs e identificadores de proceso en `%TEMP%/fiuba-icon-preview-20261015/`. No guardar credenciales ni cookies en esos archivos.
- Comprobar `/login`, recursos estáticos y rechazo del endpoint demo a través de HTTPS público antes de entregar el enlace.
- El browser harness conserva su propio servidor y las integraciones externas desactivadas. No reutilizar el servidor público para pruebas que dependan del login demo.
