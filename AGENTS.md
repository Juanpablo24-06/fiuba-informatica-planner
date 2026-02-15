# Instrucciones para agentes (Planificador FIUBA Informática)

Este repo contiene:
- Una web privada (Next.js) para organizar mi carrera de Ingeniería en Informática (FIUBA): dashboard + mapa de correlatividades + eventos (internos y Google Calendar) + chat con AI.

## Alcance y reglas generales
- La web es solo para mí y 1–2 personas más; siempre requiere login (ya implementado).
- Podés refactorizar y cambiar lo necesario, pero con cuidado de no romper features existentes. Si tocás algo sensible, validá con `npm run lint` y `npm run build` antes de terminar.
- **Nunca** comitees secretos ni escribas keys en el repo. No modifiques `.env.local` con valores reales.
- Cambios de DB siempre vía migrations en `supabase/migrations/` (no edites datos “a mano” como solución final).
- Mantener el stack actual (web): Next.js (App Router) + TypeScript + Tailwind + Supabase.
- Package manager: usar `npm` (hay `package-lock.json`).

## Objetivo del producto (1 frase)
Mostrar de manera clara y precisa la ruta que voy a seguir en la carrera (materias, correlativas, progreso y eventos), con una UX excelente (mobile-first).

## Navegación y estructura (decisiones fijas)
- El mapa vive como **página/sección separada** (`/mapa`). No debe abrirse al inicio como home.
- El dashboard es la vista principal (`/` dentro de `(app)`), con resumen semanal, gestión de cuatrimestres/materias y acceso al mapa.

## Guía de estilo (Deep Graphite & Electric Amethyst)
El diseño debe sentirse técnico, minimalista y “premium”, con profundidad por capas.

### Colores base
- Fondo principal: `#0D0E12` (grafito profundo).
- Acento: amatista eléctrico (violeta/índigo). Elegí una tonalidad consistente y usala para estados activos/CTA.

### Fondo “Aurora”
- Usar 1–3 blobs/círculos difuminados (blur 100–150px) con opacidad baja (5–10%) para dar atmósfera sin distraer.

### Superficies (glass + bento)
- Bento grid con bordes muy redondeados (≥ `1.5rem`, ideal `2rem`).
- Glassmorphism:
  - Borde fino: `1px solid rgba(255,255,255,0.05)`
  - Fondo: `rgba(255,255,255,0.02)`
  - `backdrop-filter: blur(20px)` donde aplique

### Tipografía
- Sans moderna para títulos/cuerpo.
- Monospace solo para datos técnicos (códigos, créditos, logs).
- Jerarquía: títulos fuertes; descripciones más apagadas (ej `text-slate-500`).

### Iconografía y micro-interacciones
- Iconos lineales (stroke 1.5–2px).
- Hover: respuesta sutil (scale ~1.02–1.05, brillo/borde más visible).
- Estados:
  - Aprobado: verde esmeralda suave + glow.
  - Pendiente: gris/azul apagado.
  - Alerta: ámbar/rosa rojizo.

### Filosofía de mensajes
- Evitar “bienvenidas” y estados genéricos. Mostrar solo lo útil y contextual.
- Detalle bajo demanda: tooltips/paneles/drawers, mantener la vista principal limpia.

## Responsive (prioridad alta)
- Mobile-first: todo debe verse y usarse bien en teléfono.
- Patrones esperados:
  - Desktop: panel lateral.
  - Móvil: bottom sheet/drawer deslizable.
- Controles grandes y accesibles con el pulgar; evitar overlays que tapen contenido crítico.

## Mapa (`/mapa`) — comportamiento esperado
- Zoom/pan natural:
  - Desktop: rueda = zoom suave (ideal “al cursor”), drag = pan.
  - Móvil: pinch-to-zoom + drag.
- El mapa se renderiza full-page dentro de `/mapa` desde el inicio (no hay modo expandir).
- La TopNav permanece visible; los controles del mapa son overlays sobre el canvas.
- Interacción por materia:
  - Hover (solo desktop): tooltip con info básica (correlativas requeridas y qué desbloquea, y lo mínimo relevante).
  - Click/tap: fija selección y abre panel persistente con detalles.
- El mapa puede ordenar/mostrar por cuatrimestre **sin mostrar títulos** de cuatrimestre; solo separación visual/espaciado.
- El mapa es principalmente **visualización/selección** (no edición directa desde el mapa).

## Dashboard — comportamiento esperado
- Multicuatrimestre: ver cuatrimestres pasados, actual y futuros.
- Al borrar un cuatrimestre: borrar todo lo asociado (enrollments/eventos/etc.) **con confirmación explícita**.
- La UX de gestión debe ser clara y bien integrada visualmente.

## Google Calendar + AI (integraciones se configuran después)
El código debe quedar listo para integrar, pero sin depender de credenciales reales durante el desarrollo.

### Calendar
- Hoy existe lectura vía service account. Mantener el flujo actual funcionando.
- Si se agrega “sync/en vivo”: diseñar para soportar notificaciones/webhooks + botón manual, pero dejarlo feature-flagged si no hay env vars.

### AI: reglas estrictas
- La AI **no modifica** Google Calendar.
- La AI no genera “código ejecutable” para la web. Solo devuelve **JSON estructurado** validado (Zod/JSON schema).
- Si falta la key del proveedor (p.ej. `GEMINI_API_KEY`), los endpoints deben responder “no configurado” sin romper la web.
- Guardar `confidence` y `needs_review` para resultados dudosos.

## Chat con AI
- El chat existe para **admin y viewer**.
- Cada rol tiene su propio historial (threads separados).
- Acciones:
  - Viewer: solo lectura/consultas (no escribe datos).
  - Admin: puede **crear/editar/borrar** (cuatrimestres, materias activas, eventos internos, estados/notas, etc.).
- Seguridad de acciones (obligatorio):
  - Implementar una **lista blanca** de acciones + validación de inputs.
  - Pedir **confirmación** antes de cualquier operación de escritura.
  - Guardar auditoría de acciones (quién/rol, qué cambió, cuándo, payload).

### Límite y resumen del historial
- Mantener un máximo de ~10 conversaciones “activas” por rol.
- Cuando se crea una nueva y se supera el límite, archivar la más antigua.
- Cuando haya ~5 archivadas, generar un resumen (vía AI cuando esté configurada; fallback: resumen simple determinístico) y guardar:
  - resumen por thread y/o resumen agregado por rol
  - mantener esos resúmenes disponibles como fuente para RAG.
- RAG: recuperar solo contexto relevante (materias, cuatrimestre actual, eventos de la semana, resúmenes) y no volcar toda la DB al prompt.

## Validación mínima antes de entregar cambios
- `npm run lint`
- `npm run build`
- Si se cambia lógica de UI crítica: navegar `/` y `/mapa` y verificar que no haya errores de hydration/console (manual).
