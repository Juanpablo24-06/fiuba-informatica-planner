# Chat And AI Runbook

## Superficie Principal

- UI: `components/dashboard/chat-panel.tsx`
- Ruta: `app/api/chat/route.ts`
- Orquestación y acciones: `modules/chat/application/*`
- Transporte: `modules/chat/adapters/http.ts`
- Proveedores y memoria: `modules/chat/adapters/*`
- Schemas y reglas puras: `modules/chat/domain/*`
- `lib/ai/*` y `lib/chat/*` son fachadas compatibles.

## Riesgos

- Puede activar acciones admin reales.
- Mezcla contexto académico, proveedores AI y persistencia opcional.
- Tiene varias rutas de fallback y recuperación ante errores de proveedor.
- OpenRouter usa `https://openrouter.ai/api/v1/chat/completions` con formato OpenAI-compatible.

## Antes De Cambiar

- Revisar `modules/chat/application/chat.ts` y `modules/chat/application/admin-actions.ts`
- Confirmar si el cambio toca solo presentación o también acciones/datos
- Revisar qué tests existentes cubren normalización, streaming y acciones
- Para chat AI, configurar al menos uno de `OPENROUTER_API_KEY` o `NVIDIA_API_KEY`.
- OpenRouter usa `OPENROUTER_MODEL` con default `openai/gpt-oss-120b:free`; `OPENROUTER_REQUEST_TIMEOUT_MS` y `OPENROUTER_MAX_TOKENS` son opcionales.
- El esfuerzo real de razonamiento se envía a OpenRouter `gpt-oss`, mapeando `bajo|medio|alto` a `low|medium|high`.
- NVIDIA MiniMax M3 usa el parámetro documentado `chat_template_kwargs.thinking_mode` (`disabled|adaptive|enabled`). GLM 5.1/5.2 y MiniMax M2.7 se dejan en razonamiento nativo automático porque la API no documenta un selector de esfuerzo equivalente.
- El campo `response.reasoning` solo se llena cuando el proveedor devuelve metadata real (`reasoning` o `reasoning_content`); nunca se genera desde el prompt.
- El contexto del chat incluye todos los cuatrimestres, materias, correlativas, cursadas y eventos internos disponibles. Las acciones de escritura requieren sesión admin y el interruptor explícito `Permitir acciones`.

## Validación Recomendada

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e -- --grep "chat|admin"`
