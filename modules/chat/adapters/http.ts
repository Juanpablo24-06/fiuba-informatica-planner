import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { processAttachments, type ProcessedAttachment } from "./attachments";
import { hasAnyAIProviderConfigured } from "./provider";
import { payloadSchema } from "../domain/request";
import { encodeChatStreamEvent, type ChatStreamEvent } from "../domain/streaming";
import { chatService } from "../server";
const parseIncomingRequest = async (request: NextRequest) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return {
      payload: await request.json().catch(() => null),
      attachments: [] as ProcessedAttachment[]
    };
  }
  const formData = await request.formData();
  const serialized = formData.get("payload");
  let payload: unknown = null;
  if (typeof serialized === "string") {
    try {
      payload = JSON.parse(serialized);
    } catch {
      payload = null;
    }
  }
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  return { payload, attachments: await processAttachments(files) };
};

const fallbackMessage = (error: string) => {
  const normalized = error.toLowerCase();
  if (normalized.includes("timeout")) return "El modelo tardó demasiado en responder. Podés reintentar.";
  if (normalized.includes("image")) return "El modelo seleccionado no pudo procesar la imagen adjunta.";
  if (normalized.includes("network")) return "No pude comunicarme con el proveedor del modelo.";
  return "No pude obtener una respuesta válida del modelo en este intento.";
};

export const executeChatRequest = async (request: NextRequest) => {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (!hasAnyAIProviderConfigured()) {
    return NextResponse.json(
      {
        error: "Chat AI deshabilitado.",
        instructions: "Definí NVIDIA_API_KEY u OPENROUTER_API_KEY y volvé a desplegar."
      },
      { status: 501 }
    );
  }
  let incoming: Awaited<ReturnType<typeof parseIncomingRequest>>;
  try {
    incoming = await parseIncomingRequest(request);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "attachment_error";
    const message = detail === "attachments_too_large"
      ? "Los adjuntos superan el límite total permitido."
      : detail === "too_many_attachments"
        ? "Podés adjuntar como máximo tres archivos."
        : "No pude procesar uno de los adjuntos.";
    return NextResponse.json({ error: message, details: detail }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(incoming.payload);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: ChatStreamEvent) => {
        if (!request.signal.aborted) controller.enqueue(encoder.encode(encodeChatStreamEvent(event)));
      };
      void chatService.runChat({ role: session.role, signal: request.signal, payload: parsed.data, attachments: incoming.attachments, emit })
        .catch((error) => {
          if (!request.signal.aborted) {
            const details = error instanceof Error ? error.message : "provider_error";
            emit({ type: "error", message: fallbackMessage(details), details });
          }
        })
        .finally(() => controller.close());
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff"
    }
  });
};
