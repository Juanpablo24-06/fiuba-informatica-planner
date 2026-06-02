# MCP And ChatGPT Custom Runbook

## Qué Es

La app expone un servidor MCP remoto en la misma deployment de Next.js/Vercel para que un GPT custom de ChatGPT pueda leer y mutar datos admin reales sin pasar por la UI web.

### Endpoint

- Producción: `https://tu-dominio.vercel.app/api/mcp`
- Local con túnel HTTPS: `https://<tu-tunel>/api/mcp`

## Alcance Actual

La superficie MCP actual expone tools para:

- listar y consultar cuatrimestres
- listar y consultar materias
- listar cursadas y eventos
- crear, actualizar y borrar cuatrimestres, materias, cursadas y eventos
- consultar y ejecutar el bootstrap histórico del CBC
- obtener un snapshot admin compacto para planificación en ChatGPT

## Seguridad

El endpoint MCP ejecuta tools admin sobre datos reales, así que debe quedar protegido por token bearer o por una sesión web admin válida.

Variables soportadas:

- `MCP_BEARER_TOKEN`: token específico para `/api/mcp`.
- `EXTERNAL_ADMIN_BEARER_TOKEN`: token compartido usable por MCP y GPT Actions.

Si no configurás un token, solo funciona una sesión web admin con cookie. Para ChatGPT custom remoto, configurá un bearer token.

## Variables De Entorno Relevantes

### Requeridas para que el backend admin funcione

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Kill switch opcional del MCP

- `MCP_ENABLED`
  - si vale `"false"`, el endpoint responde `503`
  - si no está definido, el MCP queda habilitado

### Auth del conector remoto

- `MCP_BEARER_TOKEN` o `EXTERNAL_ADMIN_BEARER_TOKEN`
  - enviar como `Authorization: Bearer <token>`
  - usar un valor largo, aleatorio y distinto de las contraseñas web

## Cómo Probar Localmente

1. Levantar la app:

```bash
npm run dev
```

2. Exponerla con un túnel HTTPS como `ngrok` o similar.
3. Usar la URL pública terminada en `/api/mcp`.

## Cómo Conectarlo A ChatGPT Custom

1. Deployar la app en Vercel con las variables de entorno productivas.
2. Confirmar que la URL `https://tu-dominio/api/mcp` responde.
3. Abrir ChatGPT y entrar al constructor/configuración del GPT custom.
4. Añadir un conector MCP remoto apuntando a esa URL.
5. Configurar auth bearer con el valor de `MCP_BEARER_TOKEN` o `EXTERNAL_ADMIN_BEARER_TOKEN`.
6. Guardar la configuración del GPT.
7. Probar instrucciones simples:
   - “lista los cuatrimestres”
   - “muéstrame el snapshot admin”
   - “crea una materia de prueba”

## Qué Revisar Si No Conecta

- `MCP_ENABLED` no debe ser `"false"`
- el conector debe enviar `Authorization: Bearer <token>`
- la app debe estar deployada con HTTPS público
- `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` deben existir en Vercel
- `npm run build` debe pasar localmente antes del deploy

## Qué Revisar Si Conecta Pero Falla Al Ejecutar Tools

- errores de Supabase o datos inválidos
- UUIDs incorrectos en updates/deletes
- filtros de `termId` o `enrollmentId` inexistentes
- ausencia de la columna `schedule` en entornos viejos sin la migración `003_enrollment_schedule.sql`

## Siguiente Endurecimiento Recomendado

Cuando el flujo básico con ChatGPT ya esté validado, el siguiente paso natural es subir de token compartido a identidad por usuario:

- OAuth/per-user auth si querés que varias personas se conecten con identidad propia
- auditoría de invocaciones y confirmación para acciones destructivas
