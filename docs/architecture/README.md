# Architecture Overview

## Superficie Del Producto

La app es un planificador privado para Ingeniería en Informática FIUBA con cuatro dominios principales:

- `dashboard/agenda`: resumen académico, agenda, vistas semanales y evaluaciones
- `map`: mapa interactivo de correlatividades y navegación asociada
- `chat/ai`: Synapse, proveedores AI y acciones admin asistidas
- `admin/data`: gestión de cuatrimestres, materias, cursadas y eventos

## Arquitectura

Monolito modular: una aplicación Next.js, con puertos y adaptadores en las operaciones de negocio. No requiere otro backend ni cambios en la base.

| Módulo | Responsabilidad | Entrada de producción |
| --- | --- | --- |
| `modules/academic` | Cuatrimestres, materias y relaciones, cursadas, eventos, CBC y lecturas académicas | `server.ts` |
| `modules/planning` | Escenarios, selecciones, confirmación, ofertas e historial del plan | `server.ts` |
| `modules/chat` | Synapse, acciones, memoria, adjuntos y proveedores AI | `server.ts`; `adapters/http.ts` |
| `modules/calendar` | Google Calendar, sincronización y enriquecimiento/resumen AI | `server.ts`; `intelligence-server.ts` |

Dentro de cada módulo:

- `domain/`: modelos, schemas, reglas y cálculos puros.
- `application/`: casos de uso y contratos; las factories reciben repositorios/gateways sustituibles.
- `adapters/`: Supabase, proveedores, caché de lecturas y transporte.
- `server.ts`: composición de producción marcada `server-only`, sin consultas al importar.

Las dependencias apuntan al núcleo: los adaptadores implementan contratos de aplicación; aplicación usa dominio. Dominio y aplicación no importan Next.js, React, Supabase, adaptadores ni composición. Los módulos comparten contratos explícitos de dominio/aplicación.

El panel HTTP, MCP y GPT Actions consumen la misma instancia de servicio académico. El caso de uso de acciones del chat recibe ese mismo servicio; interpreta nombres y fechas, y delega la validación y las escrituras. Los permisos HTTP siguen en las entradas, y la orquestación del chat exige rol admin y `allowActions` antes de ejecutar acciones.

## Estructura Del Repositorio

- `app/`: rutas App Router y API routes
- `components/`: UI por dominio y layout compartido
- `modules/`: implementación canónica de los cuatro módulos
- `lib/`: fachadas de compatibilidad y utilidades compartidas; helpers de presentación de mapa/dashboard permanecen cerca de esas superficies
- `tests/`: pruebas unitarias, source tests y guardrails ligeros
- `supabase/`: config y migrations

## Invariantes Importantes

- El mapa y sus transiciones deben sentirse estables y no degradar la navegación.
- El dashboard, agenda y admin comparten datos académicos; un cambio de modelo impacta varias superficies.
- El chat puede derivar en acciones admin, por lo que mezcla UI, validación, proveedores y mutación de datos.
- Las integraciones con Supabase y Google Calendar no son simuladas por defecto; pueden tocar datos reales.
- La UI debe cumplir el contrato responsive documentado en [responsive-ui.md](responsive-ui.md); evitar anchos rígidos, zonas muertas entre breakpoints y scroll horizontal del documento.

## Validación Recomendada

- Límites y comportamiento aislado: `npm test -- tests/architecture tests/modules`
- Contratos admin/MCP: `npm test -- tests/admin tests/mcp tests/gpt-actions`
- Cambios visuales o de navegación: `npm run harness:smoke`
- Cambios de dominio o lógica: `npm run typecheck`, `npm test`
- Cambios de integración o entrega: `npm run verify`

Las pruebas de arquitectura analizan imports reales, incluidos reexports y dependencias transitivas del cliente. Los casos de uso se prueban con repositorios en memoria, sin credenciales ni servicios externos. La prueba de integración de adaptadores usa dobles de Supabase; el browser harness conserva la UI y sustituye las mutaciones de prueba.

Ver [spec de migración](../specs/2026-10-03-modular-architecture.md). Las rutas `lib/admin`, `lib/ai`, `lib/chat`, `lib/planner`, `lib/queries.ts` y `lib/google-calendar.ts` mantienen los imports existentes sin duplicar implementaciones.

## Hotspots

Ver [hotspots.md](hotspots.md).
