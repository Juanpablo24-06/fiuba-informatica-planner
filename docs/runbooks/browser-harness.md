# Browser Harness Runbook

## Objetivo

El browser harness existe para validar la UI real y no depender solo de lectura de código o tests unitarios.

## Comandos

- `npm run e2e`
- `npm run e2e:headed`
- `npm run harness:smoke`
- `npm run e2e:install`

## Qué Cubre El Smoke Flow

- login demo
- resumen
- mapa
- agenda semanal
- agenda de evaluaciones

## Qué Cubre La Suite Base

- login demo
- navegación principal
- entrada a admin
- apertura del panel de Synapse

## Riesgo Operativo

La automatización puede tocar flujos reales de la app. En este repo no se asume modo solo lectura por defecto. Si una prueba o una sesión headed entra en admin o dispara acciones, puede impactar datos reales o integraciones reales.

## Artefactos

- `playwright-report/`
- `test-results/`

Ambos están ignorados en git.

## Uso Recomendado

- cambio visual o de navegación: `npm run harness:smoke`
- cambio mayor de UI: `npm run e2e`
- inspección manual o debugging: `npm run e2e:headed`
