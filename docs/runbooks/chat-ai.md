# Chat And AI Runbook

## Superficie Principal

- UI: `components/dashboard/chat-panel.tsx`
- Ruta: `app/api/chat/route.ts`
- Lógica AI: `lib/ai/*`
- Lógica de chat: `lib/chat/*`

## Riesgos

- Puede activar acciones admin reales.
- Mezcla contexto académico, proveedores AI y persistencia opcional.
- Tiene varias rutas de fallback y recuperación ante errores de proveedor.
- OpenRouter usa `https://openrouter.ai/api/v1/chat/completions` con formato OpenAI-compatible.

## Antes De Cambiar

- Revisar `app/api/chat/route.ts` y `lib/ai/admin-actions.ts`
- Confirmar si el cambio toca solo presentación o también acciones/datos
- Revisar qué tests existentes cubren normalización, streaming y acciones
- Para chat AI, configurar al menos uno de `OPENROUTER_API_KEY`, `NVIDIA_API_KEY` o `GEMINI_API_KEY`.
- OpenRouter usa `OPENROUTER_MODEL` con default `openai/gpt-oss-120b:free`; `OPENROUTER_REQUEST_TIMEOUT_MS` y `OPENROUTER_MAX_TOKENS` son opcionales.
- El campo `reasoning` real se envía solo a modelos OpenRouter `gpt-oss`, mapeando `bajo|medio|alto` a `low|medium|high`.

## Validación Recomendada

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e -- --grep "chat|admin"`
