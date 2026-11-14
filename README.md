# Planificador FIUBA Informática (Plan 2023)

Aplicación web con demo pública y modalidad normal con contraseña para seguir la carrera de Ingeniería en Informática de FIUBA. El proyecto hoy ya no es solo un dashboard: incluye resumen académico, mapa interactivo de correlatividades, agenda integrada, panel admin y un asistente interno para consultar o editar información académica.

**[Probar la demo online](https://fiuba-plan-demo.stillfudge8.chatgpt.site/login)** — sin instalar nada, con datos ficticios guardados en tu navegador.

## Licencia y uso

El código se publica bajo licencia MIT. Si querés monetizar este proyecto directamente, empaquetarlo como producto comercial o incluirlo dentro de un servicio pago, por favor contactá primero al mantenedor para charlar colaboración, atribución, soporte o un acuerdo comercial separado.

Más detalles:
- [LICENSE](LICENSE)
- [NOTICE](NOTICE.md)
- [AI disclosure](AI_DISCLOSURE.md)

## Desarrollo asistido por IA

Este proyecto fue desarrollado con asistencia intensiva de IA. GPT fue la familia de modelos más usada para ingeniería, corrección, refactor, seguridad, documentación y agregado de funciones. Claude Opus 4.5 desde Antigravity, Gemini 3 Flash, Gemini 3.1 Pro y Stitch también aportaron análisis, prototipado visual, diseño y variantes de producto.

Ninguna herramienta fue la única autora del diseño o del código; el resultado salió de dirección humana, revisión e integración con apoyo de varios modelos. Ver [AI_DISCLOSURE.md](AI_DISCLOSURE.md).








## Elegir modalidad

El código completo de ambas versiones está incluido. La **demo pública** usa datos ficticios guardados en el navegador; la **modalidad normal** conserva contraseñas, base de datos y APIs. La elección se configura al arrancar, sin un selector de modalidad visible en la página.

```sh
npm ci
npm run demo:install
npm run dev:demo
```

Para la demo no se necesitan tokens, cuentas, IA ni base de datos. `npm run build:demo` genera `apps/demo/dist`, listo para hosting estático. [Abrir la demo publicada](https://fiuba-plan-demo.stillfudge8.chatgpt.site/login).

Para uso normal, seguir el setup inferior y configurar `APP_MODE=standard`. El ejemplo de entorno propone `APP_MODE=demo`; los comandos `dev`, `build` y `start` respetan esa preferencia. También hay comandos explícitos `dev:standard`, `build:standard` y `start:standard`. Las instalaciones que no definan `APP_MODE` conservan su funcionamiento normal.

[Configuración, aislamiento y publicación de las dos modalidades](docs/runbooks/app-modes.md).

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
- Chat interno “Synapse” con selección de proveedor/modelo, historial visible y persistencia habilitada por defecto.
- Navegación entre secciones con loaders y transición dedicada para entrar al mapa.
- Tests con Vitest y utilidades para seed y hashing de passwords.

## Stack
- Next.js 16 (`App Router`) + React 19 + TypeScript
- Tailwind CSS
- Supabase (Postgres)
- Google Calendar API (`googleapis`)
- Zod
- Vitest + Testing Library

## Requisitos
- Node.js 22 requerido
- npm
- Para la modalidad normal: un proyecto de Supabase
- Opcional: credenciales de Google Calendar
- Opcional: credenciales de AI (`OpenRouter` o `NVIDIA`)

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
- `CHAT_PERSISTENCE_ENABLED` (por defecto activo; usar `false` para desactivar)
- `NEXT_PUBLIC_CHAT_PERSISTENCE` (por defecto activo; usar `false` para desactivar)
- `CRON_SECRET`
- `MCP_ENABLED` (`false` para apagar el endpoint MCP remoto)

#### Google Calendar
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_TIMEZONE`

#### AI / chat
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_API_URL`
- `OPENROUTER_REQUEST_TIMEOUT_MS`
- `OPENROUTER_MAX_TOKENS`
- `NVIDIA_API_KEY`
- `NVIDIA_MODEL`
- `NVIDIA_API_URL`
- `NVIDIA_REQUEST_TIMEOUT_MS`
- `NVIDIA_MAX_TOKENS`

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
- `npm run dev:harness`: desarrollo local fijo en `127.0.0.1:3000` para browser automation
- `npm run build`: build de producción
- `npm run start`: servidor de producción
- `npm run typecheck`: chequeo de tipos con `tsc --noEmit`
- `npm run lint`: lint
- `npm test`: tests
- `npm run test:watch`: tests en watch mode
- `npm run verify`: pipeline local de verificación (`typecheck`, `lint`, `test`, `build`)
- `npm run e2e`: suite Playwright
- `npm run e2e:headed`: suite Playwright visible
- `npm run harness:smoke`: recorrido corto de navegador
- `npm run e2e:install`: instala Chromium para Playwright
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
- elegir proveedor/modelo (`OpenRouter` o `NVIDIA`),
- usar GLM 5.1/5.2 y MiniMax M2.7/M3 desde NVIDIA NIM,
- definir un esfuerzo real solo cuando el proveedor expone ese control; los modelos nativos se identifican como automáticos,
- consultar todo el contexto académico disponible,
- ver y recuperar el historial desde un panel propio del modal,
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
- `GET/POST /api/mcp`
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

### MCP Para ChatGPT Custom

La misma app puede exponer un servidor MCP remoto para ChatGPT custom en:

- `https://tu-dominio.vercel.app/api/mcp`

Notas importantes:

- No necesitás otro proyecto de Vercel para esta primera versión.
- Si `MCP_ENABLED=false`, el endpoint queda apagado.
- Esta primera iteración está abierta para pruebas y no exige login/OAuth.

Guía operativa completa:

- [docs/runbooks/mcp-chatgpt.md](docs/runbooks/mcp-chatgpt.md)

## Inspiración
El mapa de correlatividades toma inspiración de FIUBA-Map:
- https://fede.dm/FIUBA-Map/
- https://github.com/FdelMazo/FIUBA-Map

## Estado del README
Este README intenta reflejar el estado actual del proyecto real. Si cambias arquitectura, variables, scripts o secciones principales, conviene actualizarlo en la misma tanda de trabajo.

## Harness Del Repo

Además del README, el repo ahora usa:

- `AGENTS.md`: índice operativo para agentes
- `docs/README.md`: índice de conocimiento del sistema
- `docs/specs/`: specs nuevas
- `docs/plans/active/` y `docs/plans/completed/`: planes vivos
- `docs/runbooks/`: guías de operación por dominio

Nota: `docs/superpowers/` queda como ubicación histórica de documentos previos, pero no como convención nueva por defecto.
