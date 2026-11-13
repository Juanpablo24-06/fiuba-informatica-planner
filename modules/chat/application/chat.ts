import type { AIProviderGateway } from "../domain/provider";
import type { ChatPayload } from "../domain/request";
import type { ProcessedAttachment } from "../domain/attachments";
import type { ChatContextReader, ConversationRepository, MemoryGateway } from "./ports";
import type { ChatAdminAction } from "../domain/schemas";
import type { AdminActionResult } from "./admin-actions";
import { getMemoryOwnerKey, isExplicitMemoryRequest, isExplicitMemoryManagementRequest } from "../domain/memory";
import { buildAttachmentContext } from "../domain/attachments";
import { buildPrompt } from "../domain/prompt";
import { chatResponseSchema } from "../domain/schemas";
import { buildRequestedActions } from "../domain/action-planning";
import { JsonAnswerStreamDecoder, JsonStringFieldStreamDecoder, type ChatStreamEvent } from "../domain/streaming";

export type ChatDependencies = {
  provider: AIProviderGateway;
  memory: MemoryGateway;
  context: ChatContextReader;
  conversations: ConversationRepository;
  persistenceEnabled(): boolean;
  executeAdminActions(actions: ChatAdminAction[]): Promise<AdminActionResult[]>;
};
export const createChatService = (dependencies: ChatDependencies) => {
    const { callAIJSON, callAIJSONStream, isAIProviderConfigured } = dependencies.provider;
    const { searchRelevantMemories, snapshotMemories, updateMemory, deleteMemory, applyMemoryCandidates, addConversationToMem0, isMem0Configured } = dependencies.memory;
  const persistConversation = async ({
    role,
    payload,
    answer,
    reasoning,
    provider,
    model,
    reasoningMode,
    actionResults,
    requestedActions,
    attachments
  }: {
    role: "admin" | "viewer";
    payload: ChatPayload;
    answer: string;
    reasoning: string | null;
    provider: string | null;
    model: string | null;
    reasoningMode: string | null;
    actionResults: unknown[];
    requestedActions: unknown[];
    attachments: ProcessedAttachment[];
  }) => {
    const shouldStore =
      dependencies.persistenceEnabled() && payload.storeHistory !== false;
    let threadId = payload.threadId ?? null;
    if (!shouldStore) return { threadId, stored: false };
    if (!threadId) {
      threadId = await dependencies.conversations.createThread(role);
    }
    if (!threadId) return { threadId: null, stored: false };
    const stored = await dependencies.conversations.insertMessages([
      {
        thread_id: threadId,
        role: "user",
        content: payload.message,
        metadata: {
          role,
          attachments: attachments.map(({ name, mimeType, size, warning }) => ({
            name,
            mimeType,
            size,
            warning
          }))
        }
      },
      {
        thread_id: threadId,
        role: "assistant",
        content: answer,
        metadata: {
          reasoning_level: payload.reasoningLevel ?? "medio",
          allow_actions: role === "admin" && Boolean(payload.allowActions),
          actions_requested: requestedActions,
          action_results: actionResults,
          reasoning,
          reasoning_mode: reasoningMode,
          provider,
          model
        }
      }
    ]);
    return { threadId, stored };
  };

  const runChat = async ({
    role,
    signal,
    payload,
    attachments,
    emit
  }: {
    role: "admin" | "viewer";
    signal: AbortSignal;
    payload: ChatPayload;
    attachments: ProcessedAttachment[];
    emit: (event: ChatStreamEvent) => void;
  }) => {
    const ownerKey = getMemoryOwnerKey(role);
    const images = attachments
      .filter((attachment) => attachment.kind === "image" && attachment.dataUrl)
      .map((attachment) => ({ name: attachment.name, dataUrl: attachment.dataUrl! }));
    const providerConfigured = isAIProviderConfigured(payload.provider ?? "auto");
    const selectedProvider = images.length ? "nvidia" : payload.provider ?? "auto";
    const effectiveProvider = providerConfigured || images.length ? selectedProvider : "auto";
    const effectiveModel = images.length ? "minimaxai/minimax-m3" : payload.model;
    const allowActions = role === "admin" && Boolean(payload.allowActions);

    emit({ type: "status", status: "recordando" });
    const [academic, memories] = await Promise.all([
      dependencies.context.load(payload),
      searchRelevantMemories(ownerKey, payload.message)
    ]);
    const prompt = buildPrompt({
      role: role,
      payload,
      context: { ...academic.context, role: role },
      recentMessages: academic.recentMessages,
      memories: memories.map(({ id, content, category }) => ({ id, content, category })),
      attachmentContext: buildAttachmentContext(attachments)
    });
    const decoder = new JsonAnswerStreamDecoder();
    const analysisDecoder = new JsonStringFieldStreamDecoder("analysis_summary");
    let answerStarted = false;
    emit({ type: "status", status: "pensando" });
    let result = await callAIJSONStream(prompt, chatResponseSchema, {
      provider: effectiveProvider,
      model: effectiveModel,
      reasoningLevel: payload.reasoningLevel ?? "medio",
      images,
      signal: signal,
      callbacks: {
        // El razonamiento interno del proveedor no se expone. La interfaz transmite
        // únicamente el resumen deliberado y verificable incluido en el JSON final.
        onReasoningDelta: () => undefined,
        onContentDelta: (delta) => {
          const analysisDelta = analysisDecoder.push(delta);
          if (analysisDelta) emit({ type: "reasoning_delta", delta: analysisDelta });
          const answerDelta = decoder.push(delta);
          if (!answerDelta) return;
          if (!answerStarted) {
            answerStarted = true;
            emit({ type: "status", status: "respondiendo" });
          }
          emit({ type: "answer_delta", delta: answerDelta });
        }
      }
    });

    if (!result.ok && !answerStarted && !signal.aborted) {
      result = await callAIJSON(
        `${prompt}\nLa salida streaming anterior fue inválida. Devolvé SOLO el JSON solicitado.`,
        chatResponseSchema,
        {
          provider: effectiveProvider,
          model: effectiveModel,
          reasoningLevel: payload.reasoningLevel ?? "medio"
        }
      );
    }
    if (!result.ok) throw new Error(result.error);

    const finalAnswer = result.data.answer;
    const remaining = finalAnswer.slice(decoder.text.length);
    if (remaining) {
      if (!answerStarted) emit({ type: "status", status: "respondiendo" });
      emit({ type: "answer_delta", delta: remaining });
    }
    const requestedActions = buildRequestedActions({
      allowActions,
      modelSucceeded: true,
      responseActions: result.data.actions,
      recentMessages: academic.recentMessages,
      subjects: academic.subjects.map((subject) => ({ code: subject.code, name: subject.name }))
    });
    const actionResults = requestedActions.length
      ? await dependencies.executeAdminActions(requestedActions)
      : [];
    const persisted = await persistConversation({
      role: role,
      payload,
      answer: finalAnswer,
      reasoning: result.data.analysis_summary || null,
      provider: result.provider,
      model: result.model,
      reasoningMode: result.reasoningMode,
      actionResults,
      requestedActions,
      attachments
    });

    emit({ type: "status", status: "guardando_memoria" });
    let changedMemories = 0;
    const memoryOperations = result.data.memory_operations ?? [];
    if (
      isExplicitMemoryManagementRequest(payload.message) &&
      memoryOperations.length > 0
    ) {
      await snapshotMemories(ownerKey, "chat_memory_operation");
      const relevantIds = new Set(memories.map((memory) => memory.id));
      for (const operation of memoryOperations) {
        if (!relevantIds.has(operation.id)) continue;
        const changed = operation.type === "update"
          ? await updateMemory({ ownerKey, ...operation })
          : await deleteMemory(ownerKey, operation.id);
        if (changed) changedMemories += 1;
      }
    }
    const createdMemories = await applyMemoryCandidates({
      ownerKey,
      candidates: result.data.memory_candidates ?? [],
      explicitRequest: isExplicitMemoryRequest(payload.message),
      sourceThreadId: persisted.threadId,
      sourceExcerpt: payload.message
    });
    await addConversationToMem0({
      ownerKey,
      userMessage: payload.message,
      assistantMessage: finalAnswer,
      threadId: persisted.threadId
    });
    const attachmentWarnings = attachments
      .map((attachment) => attachment.warning)
      .filter((warning): warning is string => Boolean(warning));
    emit({
      type: "done",
      response: {
        answer: finalAnswer,
        reasoning: result.data.analysis_summary || null,
        warnings: [...result.data.warnings, ...attachmentWarnings],
        provider: result.provider,
        model: result.model,
        reasoningMode: result.reasoningMode
      },
      actionResults,
      memoriesStored: createdMemories.length + changedMemories,
      memoryProvider: isMem0Configured() ? "mem0+supabase" : "supabase",
      threadId: persisted.threadId,
      stored: persisted.stored
    });
  };

  return { runChat };
};
