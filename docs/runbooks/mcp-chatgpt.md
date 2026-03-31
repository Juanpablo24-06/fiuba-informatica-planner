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

## Seguridad Del MVP

Esta primera versión está intencionalmente abierta para pruebas rápidas:

- no usa OAuth
- no exige login web ni cookie admin
- cualquier cliente MCP que conozca la URL puede invocar tools admin

Eso sirve para validar el flujo con ChatGPT custom, pero no debe considerarse un modo seguro de exposición pública prolongada.

## Variables De Entorno Relevantes

### Requeridas para que el backend admin funcione

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Kill switch opcional del MCP

- `MCP_ENABLED`
  - si vale `"false"`, el endpoint responde `503`
  - si no está definido, el MCP queda habilitado

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
5. Guardar la configuración del GPT.
6. Probar instrucciones simples:
   - “lista los cuatrimestres”
   - “muéstrame el snapshot admin”
   - “crea una materia de prueba”

## Qué Revisar Si No Conecta

- `MCP_ENABLED` no debe ser `"false"`
- la app debe estar deployada con HTTPS público
- `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` deben existir en Vercel
- `npm run build` debe pasar localmente antes del deploy

## Qué Revisar Si Conecta Pero Falla Al Ejecutar Tools

- errores de Supabase o datos inválidos
- UUIDs incorrectos en updates/deletes
- filtros de `termId` o `enrollmentId` inexistentes
- ausencia de la columna `schedule` en entornos viejos sin la migración `003_enrollment_schedule.sql`

## Siguiente Endurecimiento Recomendado

Cuando el flujo básico con ChatGPT ya esté validado, el siguiente paso natural es agregar una capa mínima de seguridad:

- token bearer compartido o firma simple
- luego OAuth/per-user auth si querés que varias personas se conecten con identidad propia
