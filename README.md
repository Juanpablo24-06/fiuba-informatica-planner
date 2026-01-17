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
2. Ejecutar el SQL de `supabase/migrations/001_init.sql` en el SQL Editor.
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
- `enrollments`: materias activadas por cuatrimestre, estado, color, notas.
- `events`: evaluaciones/entregas con fecha, nota y estado.
- `calendar_sources`: configuración y última sincronización de Google Calendar.

## Seguridad
- Validación de passwords 100% server-side.
- Cookie HttpOnly cifrada con rol.
- Middleware protege todo el sitio, bloquea `/admin` si no es admin.
- Service role key nunca llega al cliente.

## Inspiración
El mapa de correlatividades toma inspiración del proyecto **FIUBA-Map**:
- https://fede.dm/FIUBA-Map/
- https://github.com/FdelMazo/FIUBA-Map

## Notas sobre plantillas
Las plantillas de evaluación provienen de los PDFs en `Datos/` y se precargan en `data/subjects.json`. Para materias sin detalle explícito, se usa una plantilla genérica editable desde la UI.
