# Synapse: memoria, streaming y adjuntos

## Objetivo

Convertir el chat de Synapse en un asistente persistente y transparente: respuestas en vivo, resumen verificable del análisis, memoria editable y adjuntos procesados de forma segura.

## Criterios de terminado

- La respuesta y el resumen del análisis llegan por streaming y sobreviven en el historial.
- La UI distingue `recordando`, `pensando`, `respondiendo` y `guardando memoria`.
- El resumen queda colapsado por defecto y nunca se presenta como cadena de pensamiento interna.
- La memoria se consulta por relevancia, puede crearse/editarse/eliminarse y tiene una vista tipo Wiki.
- Supabase es la fuente persistente; Mem0 Platform mejora extracción y búsqueda si existe `MEM0_API_KEY`.
- Adjuntar una imagen selecciona MiniMax M3 automáticamente.
- TXT, Markdown, JSON, CSV, PDF, DOCX y XLSX se convierten a texto limitado; el modelo recibe metadatos internos del archivo.
- Ningún adjunto supera el límite conservador del request de Vercel ni queda almacenado por defecto.
- Las acciones admin existentes siguen protegidas por rol e interruptor explícito.

## Diseño

1. `ai_memories` guarda memorias estructuradas, estado, origen, versión y un ID opcional de Mem0.
2. El scope actual será `role:admin` o `role:viewer` porque la sesión no contiene un identificador personal. Esto evita mezclar roles y deja una migración futura a usuarios reales.
3. Antes de cada respuesta se buscan hasta ocho memorias. Mem0 se intenta primero cuando está configurado; Supabase aporta respaldo y la fuente visible/editable.
4. La conversación terminada se envía a Mem0 para extracción automática y se registra una memoria local solo para operaciones explícitas o candidatos estructurados confiables.
5. La ruta `/api/chat` devuelve NDJSON: estado, fragmentos del resumen de análisis, fragmentos de respuesta y evento final con acciones, memoria y persistencia.
6. Los archivos llegan como multipart. El servidor extrae texto con límites estrictos; las imágenes se convierten a `image_url` únicamente para MiniMax M3.

## Riesgos y controles

- Mem0 Platform procesa memorias de forma asíncrona: la UI no afirmará que una memoria existe hasta recibir confirmación local o una consulta posterior.
- El razonamiento interno del proveedor no se expone; la salida estructurada incluye un resumen breve, explícito y verificable del enfoque.
- Los archivos pueden contener instrucciones maliciosas: se marcan como datos no confiables y nunca como instrucciones del sistema.
- El request de una Function tiene límite de 4.5 MB: la UI usa un límite total menor y rechaza antes de enviar.
- Las migraciones se aplican antes del despliegue y se validan con consultas de solo lectura.

## Validación

- 181 pruebas unitarias y de contrato aprobadas.
- `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` aprobados.
- 9 recorridos E2E y la regresión específica del chat aprobados en Chromium.
- Migraciones `001` a `005` aplicadas y respaldos anterior/posterior creados.
- `main` publicada y despliegue de producción verificado en Vercel.
