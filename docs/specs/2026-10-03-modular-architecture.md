# Monolito modular con puertos y adaptadores

## Objetivo

Mantener una única aplicación Next.js y sus contratos HTTP, UI y MCP. Organizar la lógica por módulos (`academic`, `planning`, `chat`, `calendar`) y aislar reglas y casos de uso de React, Next.js, Supabase y proveedores externos.

## Límites

- `domain/`: modelos, schemas y reglas puras.
- `application/`: operaciones y contratos de dependencias; recibe puertos mediante funciones factory.
- `adapters/`: persistencia, proveedores y traducción de protocolos.
- `server.ts`: composición para producción; configura los adaptadores sin ejecutar consultas al importar.
- `app/` y `components/`: transporte y presentación. Autenticación HTTP y streaming permanecen en los adaptadores de entrada.
- Los módulos consumen contratos públicos de otros módulos. El dominio nunca importa infraestructura ni composición.
- Consultas de lectura específicas pueden permanecer como adaptadores enfocados, sin añadir casos de uso vacíos.

El panel, MCP, GPT Actions y las acciones académicas del chat deben usar los mismos casos de uso. Los errores de validación preservan el código 400, y la compatibilidad de `schedule` preserva el 409 sin perder datos. Se mantienen la autorización admin y el consentimiento explícito del chat.

## Migración

Conservar fachadas en las rutas `lib/` usadas por consumidores y pruebas existentes; su implementación apunta a los módulos. No duplicar implementaciones. Extraer schemas antes de persistencia y mover reglas existentes sin eliminar correcciones locales.

No implica microservicios, cambios de base, despliegue, rediseño visual, nuevas credenciales ni migraciones ejecutadas contra datos reales.

## Prueba del resultado

Casos de uso probados con repositorios en memoria; pruebas de adaptadores con dobles de Supabase; contratos compartidos por las entradas; guardas automáticas de imports y de dependencias client/server; typecheck, lint, suite, build y browser harness. Las pruebas no realizan escrituras en servicios reales.
