# Demo y uso normal

El repositorio contiene las dos aplicaciones completas. La modalidad se elige al arrancar o compilar, nunca desde un selector público que habilite acceso a datos reales.

## Demo pública

```sh
npm ci
npm run demo:install
npm run dev:demo
```

Para usar los comandos habituales, configurar `APP_MODE=demo` en `.env.local`. `npm run dev`, `npm run build` y `npm start` seleccionan esa modalidad. También existen `build:demo` y `start:demo`. El build estático queda en `apps/demo/dist`; `start:demo` sirve una vista previa local. En hosting estático se publica ese directorio. Las rutas tienen su propio `index.html` para admitir recargas.

`apps/demo` es autocontenida: datos ficticios, permisos de demostración y persistencia en el navegador. No incluye endpoints reales ni adaptadores de Supabase. El proceso de demo no recibe credenciales del entorno de la aplicación normal; Vite no carga archivos `.env`. La CSP bloquea las conexiones de red de la app. Synapse muestra su interfaz e informa que no hay IA conectada.

## Uso normal con contraseña

Copiar `.env.example` a `.env.local`, elegir `APP_MODE=standard` y completar Supabase, hashes de contraseña y `SESSION_SECRET`. Seguir el setup de base de datos del README.

```sh
npm run dev:standard
npm run build:standard
npm run start:standard
```

Sin `APP_MODE`, las instalaciones existentes siguen usando `standard`. Las opciones explícitas de los scripts prevalecen sobre el archivo. `APP_MODE` no es una variable `NEXT_PUBLIC_*`. El deploy normal requiere un servidor Next.js; no publicar su árbol de fuentes ni archivos `.env` como archivos estáticos.

Las integraciones de IA, Google Calendar y MCP son opcionales. Cada instalación debe aportar sus propias credenciales; esta distribución no configura ninguna. El antiguo acceso de desarrollo `DEMO_LOGIN_ENABLED` está desactivado por defecto y nunca funciona en producción: no representa la demo pública aislada.

## Validación y publicación

- `npm run verify`: tipos, lint, pruebas y build normal, independiente de `APP_MODE`.
- `npm run verify:demo`: tipos, pruebas de aislamiento/persistencia y build de demo.
- Los harness de navegador están disponibles para ambas modalidades; esta revisión se validó sin navegador por solicitud del mantenedor.
- Los repositorios público y privado incluyen ambas modalidades. El historial público se mantiene independiente: nunca enviar historial privado, archivos `.env`, backups, estado Supabase, capturas o metadatos `.openai`.
- El checkout de Sites queda fuera de Git. Actualizar sus archivos de interfaz compartidos y adaptadores desde `apps/demo`, conservando únicamente allí la identidad de hosting. Publicar el build de esa misma revisión con Sites.

## Dependencias y fuentes

Las fuentes Nunito Sans, Nunito e IBM Plex Mono se incluyen localmente con sus licencias OFL; el build normal no depende de descargar Google Fonts. Se usan los mismos archivos latinos que la demo.

La actualización de noviembre de 2026 incorpora correcciones de Next.js, MCP SDK y Zod. El override de `minimatch` afecta solo a `@typescript-eslint/typescript-estree`: usa la API `minimatch(path, pattern, { dot: true })`, conservada en 11.0.1. Evita la vulnerabilidad de amplificación de patrones sin degradar `eslint-config-next` a Next 15; retirar el override cuando typescript-eslint actualice su dependencia. Lint y pruebas verifican la instalación resultante.
