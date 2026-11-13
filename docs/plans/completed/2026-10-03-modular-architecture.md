# Implementación de arquitectura modular

Estado: completado y validado el 2026-10-03.

## Criterios de aceptación

- [x] Módulo académico con dominio, puertos, casos de uso y adaptadores de persistencia para cuatrimestres, materias, relaciones, cursadas, eventos y CBC.
- [x] Panel HTTP, MCP/GPT Actions y chat usan las mismas operaciones académicas.
- [x] Planificación separa sus reglas y operaciones de Supabase; preserva escenarios, ofertas e historial.
- [x] Chat separa orquestación, transporte y proveedores/persistencia mediante dependencias explícitas.
- [x] Calendar tiene un contrato sustituible y conserva caché y sincronización.
- [x] Lecturas, tipos y reglas compartidas tienen una ubicación clara; fachadas existentes conservan compatibilidad sin duplicación.
- [x] Guardas de arquitectura detectan dependencias invertidas y filtraciones al cliente.
- [x] Pruebas de comportamiento sin servicios reales, suite existente, tipos, lint, build y browser harness pasan.
- [x] Documentación y revisión final reflejan el estado implementado.

## Fases

1. Extraer dominio y persistencia académica; componer servicios con puertos.
2. Reutilizar casos de uso desde chat; modularizar planificación e integraciones.
3. Separar orquestación y transporte de chat; establecer límites públicos y guardas.
4. Validar contratos, adaptadores, aplicación compilada y superficies de navegador; revisar diff y cerrar plan.

## Restricciones

Preservar cambios locales. No alterar datos reales, credenciales, historial Git ni identidad visual. Las rutas y los formatos públicos se mantienen. Las pruebas browser de mutación interceptan la API o usan entradas inválidas rechazadas antes de persistir.

## Evidencia de cierre

- `npm run verify`: typecheck, lint, 86 archivos / 293 pruebas y build de producción aprobados.
- Browser harness: 14 recorridos aprobados en `navigation-smoke`, `admin-validation`, `admin-chat`, `planner-flow` y `planner-scenarios` con un worker.
- Pruebas de entradas compartidas comprueban rechazo de rangos parciales inválidos y persistencia válida desde panel, GPT Actions, MCP y chat mediante un único repositorio inyectado.
- Guardas verifican dependencias de dominio/aplicación y el grafo transitivo del cliente; casos de uso usan repositorios en memoria y adaptadores usan dobles de integración.
- `git diff --check` aprobado; cambios locales preexistentes conservados. Sin commit ni push.

Google Calendar, Mem0 y proveedores AI se verificaron mediante dobles; no se certifica una operación remota en vivo. El harness final inicia su propio servidor con Google Calendar y Mem0 deshabilitados, e intercepta las mutaciones de planificación.

Ver [arquitectura implementada](../../architecture/README.md) y [spec](../../specs/2026-10-03-modular-architecture.md).
