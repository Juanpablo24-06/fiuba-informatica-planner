# Planificador FIUBA Informática (Plan 2023)

Web privada para organizar la carrera de Ingeniería en Informática (FIUBA). Incluye dashboard, mapa de correlatividades inspirado en FIUBA-Map y gestión de cuatrimestres, materias, y evaluaciones.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS + componentes UI
- Supabase (Postgres)
- Integración Google Calendar (solo lectura, service account)

## Setup local

### 1) Supabase
1. Crear proyecto en Supabase.
2. Ejecutar las migrations en orden desde `supabase/migrations/` (`001_init.sql`, `002_ai_calendar.sql`, `003_enrollment_schedule.sql` y `004_subject_type_cbc_backfill.sql`).
3. Copiar la URL y las keys (anon + service role).

### 2) Variables de entorno
Copiar `.env.example` a `.env.local` y completar:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD_HASH`
- `VIEWER_PASSWORD_HASH`
- `SESSION_SECRET`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_TIMEZONE`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_API_URL`
- `CHAT_PERSISTENCE_ENABLED`
- `NEXT_PUBLIC_CHAT_PERSISTENCE`
- `CRON_SECRET` (recomendado para asegurar cron jobs)

**Hash de passwords**
```
node scripts/hash-password.mjs "tu-password"
```
Pegar el hash resultante en `ADMIN_PASSWORD_HASH` o `VIEWER_PASSWORD_HASH`.

**SESSION_SECRET**
```
openssl rand -base64 32
```

### 3) Google Calendar (lectura)
1. Crear un Service Account en Google Cloud.
2. Descargar el JSON de credenciales.
3. Compartir tu calendario con el email del service account (permiso “Ver todos los detalles”).
4. Completar en `.env.local`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (reemplazar saltos de línea por `\n`)
   - `GOOGLE_CALENDAR_ID` (ID del calendario compartido)

### 3.1) AI + Chat (opcional)
1. Configurar proveedor AI:
   - `CEREBRAS_API_KEY` + `CEREBRAS_MODEL` (ej: `gpt-oss-*`) **o**
   - `NVIDIA_API_KEY` + `NVIDIA_MODEL` (ej: `z-ai/glm-4.7`, `z-ai/glm-5`, `MiniMaxAI/MiniMax-M2.5`) **o**
   - `GEMINI_API_KEY` (+ opcional `GEMINI_MODEL` / `GEMINI_API_URL`).
2. Poblar `calendar_events_raw` con eventos (manual o via job futuro).
3. Enriquecer con `POST /api/ai/enrich-calendar` (admin).
4. Resumir semana con `POST /api/ai/summarize-week` (admin).
5. Para historial de chat: setear `CHAT_PERSISTENCE_ENABLED=true` y `NEXT_PUBLIC_CHAT_PERSISTENCE=true`.
6. Reglas del asistente versionadas: `config/assistant-rules.json`.
7. El panel permite elegir proveedor (`Auto`, `Cerebras`, `NVIDIA`, `Gemini`), modelo y nivel de razonamiento (`bajo`, `medio`, `alto`).

### 3.2) Webhooks Google Calendar (futuro)
- Implementar OAuth y watch channels antes de usar `/api/calendar/sync-provider`.
- Ideal: cron para mantener `calendar_events_raw` actualizado.

### 3.3) Keep-alive Supabase (Vercel Cron)
- Se agregó `GET /api/cron/keepalive` para tocar una tabla liviana en Supabase.
- `vercel.json` ejecuta este endpoint 1 vez por día.
- Si definís `CRON_SECRET`, el endpoint valida `Authorization: Bearer <CRON_SECRET>`.

### 4) Seed inicial
Carga materias y correlativas desde `data/subjects.json`:
```
npm run seed
```

### 5) Correr el proyecto
```
npm install
npm run dev
```

## Deploy en Vercel (gratis)
1. Subir repo a GitHub.
2. Importar el repo en Vercel.
3. Configurar las mismas variables de entorno en Vercel.
4. Deploy.

## Estructura de datos (Supabase)
- `subjects`: materias del plan + plantilla de evaluación.
- `subject_prerequisites`: correlativas.
- `terms`: cuatrimestres.
- `enrollments`: materias activadas por cuatrimestre, estado, color, notas y horario semanal (`schedule`).
- `events`: evaluaciones/entregas con fecha, nota y estado.
- `calendar_sources`: configuración y última sincronización de Google Calendar.
- `calendar_events_raw`: eventos crudos (Google o internos) listos para AI.
- `calendar_event_enrichments`: clasificaciones AI por evento.
- `chat_threads` y `chat_messages`: historial opcional del chat. Si persistencia está desactivada, los mensajes quedan solo en memoria del navegador.

## Seguridad
- Validación de passwords 100% server-side.
- Cookie HttpOnly cifrada con rol.
- Middleware protege todo el sitio, bloquea `/admin` si no es admin.
- Service role key nunca llega al cliente.

## Mapa de correlatividades (UI)
### Como usar
- Hover sobre una materia para ver prerequisitos y materias que habilita.
- Click fija la seleccion (boton limpiar o Escape para liberar).
- Toggle Electivas para mostrar/ocultar la capa opcional.
- Busqueda por nombre o codigo con sugerencias.
- Zoom con rueda / pinch, pan con drag y modo expandido dentro del layout.

### Decisiones de diseno
- Lanes por cuatrimestre con auto-orden para reducir cruces visuales.
- Colores semanticos para prerequisitos, desbloqueos, electivas y estados.
- Curvas Bezier para conectar materias, con atenuacion de lo no relacionado.
- Panel lateral fijo para detalles y listas de correlativas/desbloqueos.

## Inspiración
El mapa de correlatividades toma inspiración del proyecto **FIUBA-Map**:
- https://fede.dm/FIUBA-Map/
- https://github.com/FdelMazo/FIUBA-Map

## Notas sobre plantillas
Las plantillas de evaluación provienen de los PDFs en `Datos/` y se precargan en `data/subjects.json`. Para materias sin detalle explícito, se usa una plantilla genérica editable desde la UI.
