# Planificador FIUBA Informática (Plan 2023)

Aplicación web privada para seguir la carrera de Ingeniería en Informática de FIUBA. El proyecto hoy ya no es solo un dashboard: incluye resumen académico, mapa interactivo de correlatividades, agenda integrada, panel admin y un asistente interno para consultar o editar información académica.

## Qué tiene hoy

### Secciones principales
- `Resumen`: estado general de la carrera, progreso por bloques, materias activas, próximas fechas y accesos rápidos.
- `Mapa`: mapa de correlatividades interactivo con zoom, pan, detalle por materia, filtros y barra de progreso acoplada a la vista.
- `Agenda`: vista semanal y mensual combinando Google Calendar, eventos internos y horarios de cursada.
- `Admin`: gestión de cuatrimestres, materias base, revisión de cursadas/eventos e integración con Calendar.

### Funciones importantes
- Login por roles (`admin` / `viewer`) con sesión server-side y middleware.
- Gestión de materias, correlativas, cuatrimestres, cursadas y eventos internos.
- Importación y cacheo de eventos desde Google Calendar vía service account.
- Chat interno “Synapse” con selección de proveedor/modelo y soporte de persistencia opcional.
- Navegación entre secciones con loaders y transición dedicada para entrar al mapa.
- Tests con Vitest y utilidades para seed y hashing de passwords.

## Stack
- Next.js 14 (`App Router`) + React 18 + TypeScript
- Tailwind CSS
- Supabase (Postgres)
- Google Calendar API (`googleapis`)
- Zod
- Vitest + Testing Library

## Requisitos
- Node.js 20+ recomendado
- npm
- Un proyecto de Supabase
- Opcional: credenciales de Google Calendar
- Opcional: credenciales de AI (`Cerebras`, `NVIDIA` o `Gemini`)

## Setup local

### 1) Instalar dependencias
```bash
npm install
```

### 2) Variables de entorno
Copiar `.env.example` a `.env.local` y completar lo que corresponda.

#### Requeridas
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD_HASH`
- `VIEWER_PASSWORD_HASH`
- `SESSION_SECRET`

#### Recomendadas
- `SESSION_TTL_DAYS`
- `GOOGLE_CALENDAR_TIMEZONE`
- `CHAT_PERSISTENCE_ENABLED`
- `NEXT_PUBLIC_CHAT_PERSISTENCE`
- `CRON_SECRET`

#### Google Calendar
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_TIMEZONE`

#### AI / chat
- `CEREBRAS_API_KEY`
- `CEREBRAS_MODEL`
- `CEREBRAS_API_URL`
- `CEREBRAS_REQUEST_TIMEOUT_MS`
- `CEREBRAS_MAX_TOKENS`
- `NVIDIA_API_KEY`
- `NVIDIA_MODEL`
- `NVIDIA_API_URL`
- `NVIDIA_REQUEST_TIMEOUT_MS`
- `NVIDIA_MAX_TOKENS`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_API_URL`

### 3) Hash de contraseñas
```bash
npm run hash-password -- "tu-password"
```

### 4) Session secret
```bash
openssl rand -base64 32
```

### 5) Supabase
El repo versiona:
- `supabase/config.toml`
- `supabase/migrations/`

Flujo recomendado:
```bash
npm run sb:login
npm run sb:link -- --project-ref <tu-project-ref>
npm run sb:push
```

Si prefieres revisar el estado antes:
```bash
npm run sb:migrations
```

Migrations actuales:
- `001_init.sql`
- `002_ai_calendar.sql`
- `003_enrollment_schedule.sql`
- `004_subject_type_cbc_backfill.sql`

### 6) Seed base
Carga materias y correlativas desde `data/subjects.json`.
```bash
npm run seed
```

### 7) Levantar el proyecto
```bash
npm run dev
```

Nota: el script de desarrollo limpia la caché problemática de webpack antes de arrancar para evitar errores locales de `.next/cache`.

## Scripts útiles
- `npm run dev`: desarrollo
- `npm run build`: build de producción
- `npm run start`: servidor de producción
- `npm run lint`: lint
- `npm test`: tests
- `npm run test:watch`: tests en watch mode
- `npm run seed`: seed de materias/correlativas
- `npm run hash-password -- "texto"`: generar hash
- `npm run sb:login`
- `npm run sb:link`
- `npm run sb:migrations`
- `npm run sb:pull`
- `npm run sb:push`

## Google Calendar
El proyecto usa una service account con permisos de solo lectura.

Pasos:
1. Crear una service account en Google Cloud.
2. Descargar el JSON de credenciales.
3. Compartir el calendario con el email de la service account.
4. Completar las variables `GOOGLE_*` en `.env.local`.

La app usa esa integración para:
- traer eventos del calendario,
- mostrarlos en `Resumen` y `Agenda`,
- enriquecerlos opcionalmente con AI.

## AI y chat
El panel de chat permite:
- elegir proveedor (`Auto`, `Cerebras`, `NVIDIA`, `Gemini`),
- elegir modelo o escribir uno custom,
- definir nivel de razonamiento,
- persistir historial opcionalmente,
- habilitar acciones de edición si el usuario es admin.

Reglas/versionado del asistente:
- `config/assistant-rules.json`

## Endpoints principales

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/demo`

### Datos académicos
- `GET/POST /api/subjects`
- `PATCH/DELETE /api/subjects/[id]`
- `GET/POST /api/terms`
- `PATCH/DELETE /api/terms/[id]`
- `GET/POST /api/enrollments`
- `PATCH/DELETE /api/enrollments/[id]`
- `GET/POST /api/events`
- `PATCH/DELETE /api/events/[id]`

### Integraciones y AI
- `POST /api/calendar/sync`
- `POST /api/calendar/sync-provider`
- `POST /api/ai/enrich-calendar`
- `POST /api/ai/summarize-week`
- `POST /api/chat`
- `GET /api/cron/keepalive`
- `POST /api/admin/bootstrap-cbc`

## Seguridad
- Validación de credenciales 100% server-side.
- Cookie de sesión sellada con `SESSION_SECRET`.
- Middleware que protege toda la app y restringe `/admin` a rol admin.
- La `service role key` de Supabase nunca va al cliente.

## Estructura del proyecto
- `app/`: rutas, layouts y API routes
- `components/dashboard/`: resumen, agenda, admin y chat
- `components/layout/`: shell, top nav, loaders, transiciones y launcher
- `components/map/`: mapa, escena de carga, detalle y nodos
- `lib/`: lógica de dominio, queries, auth, AI, calendario y utilidades
- `data/`: seed base del plan
- `config/`: configuración del asistente
- `scripts/`: tareas locales
- `supabase/`: config y migrations

## Deploy

### Vercel
1. Subir el repo a GitHub.
2. Importarlo en Vercel.
3. Configurar las variables de entorno.
4. Deploy.

Si usas cron en Vercel:
- `GET /api/cron/keepalive` puede protegerse con `CRON_SECRET`.

## Inspiración
El mapa de correlatividades toma inspiración de FIUBA-Map:
- https://fede.dm/FIUBA-Map/
- https://github.com/FdelMazo/FIUBA-Map

## Estado del README
Este README intenta reflejar el estado actual del proyecto real. Si cambias arquitectura, variables, scripts o secciones principales, conviene actualizarlo en la misma tanda de trabajo.
