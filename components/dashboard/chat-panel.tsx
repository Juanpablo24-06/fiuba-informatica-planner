"use client";

import { useEffect, useRef, useState } from "react";
import {
  Brain,
  BookOpen,
  Check,
  Database,
  FileText,
  History,
  ImageIcon,
  LoaderCircle,
  Paperclip,
  Plus,
  RotateCcw,
  Save,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL,
  VISION_CHAT_MODEL,
  reasoningLabelForModel
} from "@/lib/ai/models";
import {
  CHAT_HISTORY_KEY,
  buildChatId,
  buildSessionLabel,
  createFreshSession,
  deleteSessionAndSelectFallback,
  discardEmptyActiveSession,
  restoreChatSessions,
  syncActiveSession
} from "@/lib/chat/session-history";
import { parseChatStreamBuffer, type ChatStreamEvent } from "@/lib/chat/streaming";
import type {
  AIProvider,
  AssistantActionResult,
  ChatMessage,
  ChatRequestHistoryItem,
  ChatSession,
  ReasoningLevel
} from "@/lib/chat/types";

const persistenceEnabled = process.env.NEXT_PUBLIC_CHAT_PERSISTENCE !== "false";
const modelOptions = CHAT_MODEL_OPTIONS;
const defaultModelOption = DEFAULT_CHAT_MODEL;

const reasoningByIndex: ReasoningLevel[] = ["bajo", "medio", "alto"];
const maxAttachmentBytes = 3_400_000;
const maxAttachmentCount = 3;

type GenerationStatus =
  | "recordando"
  | "pensando"
  | "respondiendo"
  | "guardando_memoria"
  | null;

const statusLabel: Record<Exclude<GenerationStatus, null>, string> = {
  recordando: "Buscando recuerdos relevantes…",
  pensando: "Pensando…",
  respondiendo: "Respondiendo…",
  guardando_memoria: "Actualizando memoria…"
};

const quickPrompts = [
  "Qué tengo importante esta semana?",
  "Ordená mis prioridades de estudio",
  "Qué materias conviene revisar hoy?"
];

export default function ChatPanel({
  trigger,
  role = "viewer"
}: {
  trigger?: React.ReactNode;
  role?: "admin" | "viewer";
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(null);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [storeHistory] = useState(persistenceEnabled);
  const [reasoningLevel, setReasoningLevel] = useState<ReasoningLevel>("medio");
  const [allowActions, setAllowActions] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(defaultModelOption.id);
  const [provider, setProvider] = useState<AIProvider>(defaultModelOption.provider);
  const [selectedModel, setSelectedModel] = useState(defaultModelOption.value);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryWiki, setMemoryWiki] = useState("");
  const [savedMemoryWiki, setSavedMemoryWiki] = useState("");
  const [memoryCommand, setMemoryCommand] = useState("");
  const [memoryNotice, setMemoryNotice] = useState<string | null>(null);
  const [memoryProvider, setMemoryProvider] = useState("supabase");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [modelNotice, setModelNotice] = useState<string | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canEditWithAI = role === "admin";
  const currentModelOption =
    modelOptions.find((option) => option.id === selectedModelId) ??
    defaultModelOption;
  const selectedModelOverride = selectedModel.trim();
  const availableReasoningLevels = currentModelOption.reasoningLevels;
  const reasoningSelectorDisabled = availableReasoningLevels.length === 0;

  useEffect(() => () => requestAbortRef.current?.abort(), []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, isThinking]);

  useEffect(() => {
    if (
      availableReasoningLevels.length > 0 &&
      !availableReasoningLevels.includes(reasoningLevel)
    ) {
      setReasoningLevel(availableReasoningLevels[0]);
    }
  }, [availableReasoningLevels, reasoningLevel]);

  const persistSessions = (nextSessions: ChatSession[]) => {
    try {
      window.localStorage.setItem(
        CHAT_HISTORY_KEY,
        JSON.stringify(nextSessions)
      );
    } catch {}
  };

  useEffect(() => {
    const restored = restoreChatSessions({
      raw: window.localStorage.getItem(CHAT_HISTORY_KEY),
      buildId: buildChatId
    });

    setSessions(restored.sessions);
    setActiveSessionId(restored.activeSessionId);
    setMessages(restored.activeSession.messages);
    setThreadId(restored.activeSession.threadId);
    persistSessions(restored.sessions);
    setHistoryReady(true);
  }, []);

  useEffect(() => {
    if (!historyReady || !activeSessionId) return;

    setSessions((prev) => {
      const next = syncActiveSession({
        sessions: prev,
        activeSessionId,
        messages,
        threadId
      });
      persistSessions(next);
      return next;
    });
  }, [activeSessionId, historyReady, messages, threadId]);

  const selectSession = (sessionId: string) => {
    setSessions((prev) => {
      return discardEmptyActiveSession({
        sessions: prev,
        activeSessionId
      });
    });

    const selected = sessions.find((session) => session.id === sessionId);
    if (!selected) return;
    setActiveSessionId(selected.id);
    setMessages(selected.messages);
    setThreadId(selected.threadId);
    setError(null);
    setHistoryOpen(false);
  };

  const createNewSession = () => {
    setSessions((prev) => {
      const next = createFreshSession({
        sessions: prev,
        buildId: buildChatId
      });
      setActiveSessionId(next.activeSession.id);
      setMessages([]);
      setThreadId(null);
      setError(null);
      setHistoryOpen(false);
      persistSessions(next.sessions);
      return next.sessions;
    });
  };

  const deleteActiveSession = () => {
    if (!activeSessionId) return;
    setSessions((prev) => {
      const next = deleteSessionAndSelectFallback({
        sessions: prev,
        activeSessionId,
        buildId: buildChatId
      });
      setActiveSessionId(next.activeSession.id);
      setMessages(next.activeSession.messages);
      setThreadId(next.activeSession.threadId);
      setError(null);
      persistSessions(next.sessions);
      return next.sessions;
    });
    setHistoryOpen(false);
  };

  const applyMemoryPayload = (data: any) => {
    const wiki = typeof data?.wikiText === "string" ? data.wikiText : "";
    setMemoryWiki(wiki);
    setSavedMemoryWiki(wiki);
    setMemoryProvider(data?.provider ?? "supabase");
  };

  const loadMemory = async () => {
    setMemoryLoading(true);
    setMemoryNotice(null);
    try {
      const response = await fetch("/api/chat/memories", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "No se pudo cargar la memoria.");
      applyMemoryPayload(data);
    } catch (caughtError) {
      setMemoryNotice(
        caughtError instanceof Error ? caughtError.message : "No se pudo cargar la memoria."
      );
    } finally {
      setMemoryLoading(false);
    }
  };

  const toggleMemory = () => {
    setMemoryOpen((current) => {
      const next = !current;
      if (next && !savedMemoryWiki) void loadMemory();
      return next;
    });
    setHistoryOpen(false);
  };

  const saveMemoryWiki = async () => {
    setMemoryLoading(true);
    setMemoryNotice(null);
    try {
      const response = await fetch("/api/chat/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replace_wiki", wikiText: memoryWiki })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "No se pudo guardar la memoria.");
      applyMemoryPayload(data);
      setMemoryNotice("Memoria actualizada.");
    } catch (caughtError) {
      setMemoryNotice(
        caughtError instanceof Error ? caughtError.message : "No se pudo guardar la memoria."
      );
    } finally {
      setMemoryLoading(false);
    }
  };

  const runMemoryCommand = async () => {
    const command = memoryCommand.trim();
    if (!command || memoryLoading) return;
    setMemoryLoading(true);
    setMemoryNotice(null);
    try {
      const response = await fetch("/api/chat/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "command", command })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "No pude aplicar el cambio.");
      applyMemoryPayload(data);
      setMemoryCommand("");
      setMemoryNotice(data?.summary ?? "Memoria actualizada.");
    } catch (caughtError) {
      setMemoryNotice(
        caughtError instanceof Error ? caughtError.message : "No pude aplicar el cambio."
      );
    } finally {
      setMemoryLoading(false);
    }
  };

  const undoMemoryChange = async () => {
    setMemoryLoading(true);
    setMemoryNotice(null);
    try {
      const response = await fetch("/api/chat/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo" })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "No hay cambios para deshacer.");
      applyMemoryPayload(data);
      setMemoryNotice("Último cambio deshecho.");
    } catch (caughtError) {
      setMemoryNotice(caughtError instanceof Error ? caughtError.message : "No se pudo deshacer.");
    } finally {
      setMemoryLoading(false);
    }
  };

  const deleteAllMemory = async () => {
    if (!window.confirm("¿Borrar toda la memoria de Synapse? Podrás deshacer el cambio.")) return;
    setMemoryLoading(true);
    setMemoryNotice(null);
    try {
      const response = await fetch("/api/chat/memories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "BORRAR MEMORIA" })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "No se pudo borrar la memoria.");
      applyMemoryPayload(data);
      setMemoryNotice("Memoria borrada. Podés deshacer este cambio.");
    } catch (caughtError) {
      setMemoryNotice(caughtError instanceof Error ? caughtError.message : "No se pudo borrar.");
    } finally {
      setMemoryLoading(false);
    }
  };

  const addAttachments = (files: File[]) => {
    const next = [...attachments, ...files].slice(0, maxAttachmentCount);
    const total = next.reduce((sum, file) => sum + file.size, 0);
    if (files.length + attachments.length > maxAttachmentCount) {
      setError("Podés adjuntar como máximo tres archivos.");
      return;
    }
    if (total > maxAttachmentBytes) {
      setError("Los adjuntos superan el límite total de 3,4 MB.");
      return;
    }
    setError(null);
    setAttachments(next);
    if (next.some((file) => file.type.startsWith("image/"))) {
      setSelectedModelId(VISION_CHAT_MODEL.id);
      setProvider(VISION_CHAT_MODEL.provider);
      setSelectedModel(VISION_CHAT_MODEL.value);
      setModelNotice(`Cambiado a ${VISION_CHAT_MODEL.label} para analizar imágenes.`);
    }
  };

  const updateAssistantMessage = (
    id: string,
    update: (message: ChatMessage) => ChatMessage
  ) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? update(message) : message)));
  };

  const handleSend = async () => {
    const trimmed = input.trim() || (attachments.length ? "Analizá los archivos adjuntos." : "");
    if (!trimmed || isSending) return;
    setError(null);
    setInput("");

    const attachmentMetadata = attachments.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size
    }));

    const nextUserMessage: ChatMessage = {
      id: buildChatId(),
      role: "user",
      content: trimmed,
      displayed: trimmed,
      attachments: attachmentMetadata
    };
    const messagesForRequest = [...messages, nextUserMessage];
    const assistantId = buildChatId();

    setMessages((prev) => [
      ...prev,
      nextUserMessage,
      { id: assistantId, role: "assistant", content: "", displayed: "" }
    ]);

    setIsSending(true);
    setIsThinking(true);
    setGenerationStatus("recordando");

    const controller = new AbortController();
    requestAbortRef.current = controller;
    const filesForRequest = attachments;
    setAttachments([]);

    try {
      const recentHistory: ChatRequestHistoryItem[] = messagesForRequest
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({
          role: message.role,
          content: message.content.trim().slice(0, 1200)
        }))
        .filter((message) => message.content.length > 0)
        .slice(-14);

      const requestBody: Record<string, unknown> = {
        message: trimmed,
        storeHistory: storeHistory && persistenceEnabled,
        reasoningLevel,
        provider,
        allowActions: canEditWithAI ? allowActions : false,
        history: recentHistory.slice(-14)
      };
      if (provider !== "auto" && selectedModelOverride) {
        requestBody.model = selectedModelOverride;
      }
      if (threadId) {
        requestBody.threadId = threadId;
      }

      let body: BodyInit;
      let headers: HeadersInit | undefined;
      if (filesForRequest.length) {
        const formData = new FormData();
        formData.set("payload", JSON.stringify(requestBody));
        filesForRequest.forEach((file) => formData.append("files", file, file.name));
        body = formData;
      } else {
        body = JSON.stringify(requestBody);
        headers = { "Content-Type": "application/json" };
      }
      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body,
        signal: controller.signal
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = [data?.error, data?.details, data?.instructions]
          .filter((part) => typeof part === "string" && part.trim().length > 0)
          .join(" · ") || "No se pudo responder.";
        setError(message);
        updateAssistantMessage(assistantId, (assistant) => ({
          ...assistant,
          content: message,
          displayed: message
        }));
        return;
      }
      if (!response.body) throw new Error("El proveedor no abrió el stream.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = (event: ChatStreamEvent) => {
        if (event.type === "status") {
          setGenerationStatus(event.status);
          setIsThinking(event.status !== "respondiendo");
        } else if (event.type === "reasoning_delta") {
          updateAssistantMessage(assistantId, (assistant) => ({
            ...assistant,
            reasoning: `${assistant.reasoning ?? ""}${event.delta}`
          }));
        } else if (event.type === "answer_delta") {
          updateAssistantMessage(assistantId, (assistant) => {
            const content = `${assistant.content}${event.delta}`;
            return { ...assistant, content, displayed: content };
          });
        } else if (event.type === "error") {
          setError([event.message, event.details].filter(Boolean).join(" · "));
          updateAssistantMessage(assistantId, (assistant) => ({
            ...assistant,
            content: assistant.content || event.message,
            displayed: assistant.content || event.message
          }));
        } else if (event.type === "done") {
          const warnings = event.response.warnings.length
            ? `\n\nAvisos: ${event.response.warnings.join(" / ")}`
            : "";
          updateAssistantMessage(assistantId, (assistant) => ({
            ...assistant,
            content: `${event.response.answer}${warnings}`,
            displayed: `${event.response.answer}${warnings}`,
            actionResults: event.actionResults as AssistantActionResult[],
            provider: event.response.provider,
            model: event.response.model,
            reasoning: event.response.reasoning ?? assistant.reasoning ?? null,
            reasoningMode: event.response.reasoningMode
          }));
          setThreadId(event.threadId ?? threadId);
            if (event.memoriesStored > 0) {
              setMemoryNotice(
                `${event.memoriesStored} ${event.memoriesStored === 1 ? "cambio de memoria aplicado" : "cambios de memoria aplicados"}.`
              );
            if (memoryOpen) void loadMemory();
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsedStream = parseChatStreamBuffer(buffer);
        buffer = parsedStream.remainder;
        parsedStream.events.forEach(handleEvent);
      }
      buffer += decoder.decode();
      if (buffer.trim()) {
        const parsedStream = parseChatStreamBuffer(`${buffer}\n`);
        parsedStream.events.forEach(handleEvent);
      }
    } catch (caughtError) {
      if (caughtError instanceof Error && caughtError.name === "AbortError") {
        updateAssistantMessage(assistantId, (assistant) => ({
          ...assistant,
          content: assistant.content || "Respuesta cancelada.",
          displayed: assistant.displayed || assistant.content || "Respuesta cancelada."
        }));
        return;
      }
      const message = "No se pudo contactar al asistente.";
      setError(message);
      updateAssistantMessage(assistantId, (assistant) => ({
        ...assistant,
        content: assistant.content || message,
        displayed: assistant.content || message
      }));
    } finally {
      if (requestAbortRef.current === controller) {
        requestAbortRef.current = null;
      }
      setIsSending(false);
      setIsThinking(false);
      setGenerationStatus(null);
    }
  };

  const cancelSend = () => {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    setIsSending(false);
    setIsThinking(false);
    setGenerationStatus(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const selectModelOption = (modelId: string) => {
    let option =
      modelOptions.find((candidate) => candidate.id === modelId) ??
      defaultModelOption;
    if (attachments.some((file) => file.type.startsWith("image/")) && !option.supportsImages) {
      option = VISION_CHAT_MODEL;
      setModelNotice(`Las imágenes requieren ${VISION_CHAT_MODEL.label}.`);
    } else {
      setModelNotice(null);
    }
    setSelectedModelId(option.id);
    setProvider(option.provider);
    setSelectedModel(option.value);
    if (
      option.reasoningLevels.length > 0 &&
      !option.reasoningLevels.includes(reasoningLevel)
    ) {
      setReasoningLevel(option.reasoningLevels[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Sparkles className="mr-2 h-4 w-4" />
            Synapse IA
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
        }}
        className="synapse-modal h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 bg-surface/98 p-0 text-text shadow-2xl shadow-shadow/25 backdrop-blur-xl sm:h-[min(92svh,820px)] sm:w-[min(96vw,1180px)] sm:rounded-[1.75rem] sm:border sm:border-border/80"
      >
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b border-border/70 bg-surface/95 px-3 py-3 sm:px-6 sm:py-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent shadow-sm">
                  <Sparkles className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <DialogTitle className="truncate text-[17px] font-semibold leading-tight text-text">
                      Synapse IA
                    </DialogTitle>
                    <span className="truncate text-xs text-muted">
                      {activeSessionId
                        ? sessions.find((session) => session.id === activeSessionId)?.title ?? "Chat sin título"
                        : "Chat sin título"}
                    </span>
                  </div>
                  <DialogDescription className="mt-1 max-w-[38rem] text-xs leading-5 text-muted">
                    Contexto académico, memoria seleccionada y acciones bajo tu control.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex min-w-0 items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setHistoryOpen((current) => !current);
                    setMemoryOpen(false);
                  }}
                  className={`flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition ${historyOpen
                    ? "border-accent/45 bg-accent/10 text-accent"
                    : "border-border/70 bg-surface-2/55 text-muted hover:border-accent/30 hover:text-text"
                    }`}
                  aria-label="Ver historial de chats"
                  aria-expanded={historyOpen}
                >
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">Historial</span>
                </button>
                <button
                  type="button"
                  onClick={toggleMemory}
                  className={`flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition ${memoryOpen
                    ? "border-accent/45 bg-accent/10 text-accent"
                    : "border-border/70 bg-surface-2/55 text-muted hover:border-accent/30 hover:text-text"
                    }`}
                  aria-label="Ver y editar memoria"
                  aria-expanded={memoryOpen}
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Memoria</span>
                </button>
                {canEditWithAI ? (
                  <button
                    type="button"
                    onClick={() => setAllowActions((current) => !current)}
                    className={`flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition ${allowActions
                      ? "border-success/45 bg-success/10 text-success"
                      : "border-border/70 bg-surface-2/55 text-muted hover:border-accent/30 hover:text-text"
                      }`}
                    aria-pressed={allowActions}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span className="hidden lg:inline">
                      {allowActions ? "Acciones activas" : "Permitir acciones"}
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={createNewSession}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-text"
                  aria-label="Nuevo chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-text"
                    aria-label="Cerrar Synapse"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div ref={scrollRef} className="synapse-scrollbar h-full overflow-y-auto px-4 py-6 text-sm sm:px-8">
              {messages.length === 0 ? (
                <div className="mx-auto flex min-h-full w-full max-w-[700px] flex-col justify-center gap-6 py-4">
                  <div className="space-y-2">
                    <p className="text-xl font-semibold leading-tight tracking-[-0.02em] text-text sm:text-2xl">
                      ¿Qué necesitás ordenar hoy?
                    </p>
                    <p className="max-w-xl text-sm leading-6 text-muted">
                      Preguntá por materias, correlativas, cursadas o fechas. Synapse consulta los datos disponibles de toda la página antes de responder.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setInput(prompt)}
                        className="rounded-2xl border border-border/75 bg-surface-2/55 px-3.5 py-3 text-left text-xs leading-5 text-text transition hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/10"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-[760px] space-y-4">
                  {messages.map((message, index) => {
                    const isUser = message.role === "user";
                    return (
                      <div
                        key={message.id}
                        className={isUser ? "text-right" : "text-left"}
                        style={{ animationDelay: `${index * 45}ms` }}
                      >
                        <div
                          className={
                            isUser
                              ? "ml-auto max-w-[82%] animate-message-in rounded-[1.35rem] rounded-br-md border border-accent/35 bg-accent/12 px-4 py-3 text-text sm:max-w-[76%]"
                              : "mr-auto max-w-[92%] animate-message-in rounded-[1.35rem] rounded-bl-md border border-border/70 bg-surface-2/70 px-4 py-3 text-text sm:max-w-[84%]"
                          }
                        >
                          {isUser && message.attachments?.length ? (
                            <div className="mb-2 flex flex-wrap justify-end gap-1.5">
                              {message.attachments.map((attachment) => (
                                <span
                                  key={`${message.id}-${attachment.name}`}
                                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-accent/25 bg-surface/55 px-2 py-1 text-[10px] text-muted"
                                >
                                  {attachment.type.startsWith("image/") ? (
                                    <ImageIcon className="h-3 w-3" />
                                  ) : (
                                    <FileText className="h-3 w-3" />
                                  )}
                                  <span className="max-w-[180px] truncate">{attachment.name}</span>
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <p className="whitespace-pre-wrap leading-6">
                            {message.content || (generationStatus ? statusLabel[generationStatus] : "Preparando respuesta…")}
                          </p>

                          {!isUser && (message.model || message.reasoningMode || message.reasoning) ? (
                            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/55 pt-2 text-[10px] text-muted">
                              {message.model ? <span>{message.provider} · {message.model}</span> : null}
                              {message.reasoningMode ? (
                                <span className="inline-flex items-center gap-1">
                                  <Brain className="h-3 w-3" />
                                  {message.reasoningMode === "effort"
                                    ? "Esfuerzo aplicado"
                                    : message.reasoningMode === "thinking_mode"
                                      ? "Modo de pensamiento aplicado"
                                      : "Razonamiento nativo"}
                                </span>
                              ) : null}
                              {message.reasoning ? (
                                <details className="basis-full rounded-lg border border-border/45 bg-surface/35 px-2.5 py-2">
                                  <summary className="cursor-pointer select-none text-accent/85 hover:text-accent">
                                    Resumen del análisis
                                  </summary>
                                  <p className="mt-2 whitespace-pre-wrap border-t border-border/40 pt-2 leading-5 text-muted">
                                    {message.reasoning}
                                  </p>
                                </details>
                              ) : null}
                            </div>
                          ) : null}

                          {!isUser && message.actionResults?.length ? (
                            <div className="mt-3 rounded-xl border border-success/25 bg-success/5 p-2 text-xs text-muted">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-success">
                                Cambios aplicados
                              </p>
                              <div className="mt-1 space-y-1">
                                {message.actionResults.map((result, resultIndex) => (
                                  <p key={`${message.id}-${result.type}-${resultIndex}`}>
                                    {result.ok ? "OK" : "ERROR"} · {result.summary}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {generationStatus ? (
                <div className="mx-auto mt-4 max-w-[760px]">
                  <div className="mx-auto w-fit rounded-full border border-border/70 bg-surface-2/80 px-3 py-2 text-xs text-muted">
                    <div className="flex items-center gap-2">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin text-accent" />
                      {statusLabel[generationStatus]}
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="mx-auto mt-4 max-w-[760px] rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning">
                  {error}
                </div>
              ) : null}
            </div>

            {historyOpen ? (
              <>
                <button
                  type="button"
                  className="absolute inset-0 z-10 cursor-default bg-shadow/15 lg:hidden"
                  aria-label="Cerrar historial"
                  onClick={() => setHistoryOpen(false)}
                />
                <aside className="absolute inset-y-0 left-0 z-20 flex w-[min(86%,300px)] flex-col border-r border-border/75 bg-surface/98 shadow-2xl shadow-shadow/15">
                  <div className="flex items-center justify-between border-b border-border/65 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-text">Historial</p>
                      <p className="mt-0.5 text-[11px] text-muted">Guardado en este dispositivo</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
                      aria-label="Cerrar historial"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="synapse-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
                    {!historyReady ? (
                      <p className="px-3 py-4 text-xs text-muted">Cargando historial...</p>
                    ) : sessions.filter((session) => session.messages.length > 0).length === 0 ? (
                      <p className="px-3 py-4 text-xs leading-5 text-muted">Todavía no hay conversaciones guardadas.</p>
                    ) : (
                      sessions
                        .filter((session) => session.messages.length > 0)
                        .map((session) => (
                          <div
                            key={session.id}
                            className={`group mb-1 flex items-start gap-1 rounded-xl border px-2 py-2 transition ${session.id === activeSessionId
                              ? "border-accent/35 bg-accent/10"
                              : "border-transparent hover:border-border/70 hover:bg-surface-2/65"
                              }`}
                          >
                            <button
                              type="button"
                              onClick={() => selectSession(session.id)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <span className="block truncate text-xs font-medium text-text">
                                {session.title}
                              </span>
                              <span className="mt-1 block text-[10px] text-muted">
                                {buildSessionLabel(session).split(" · ")[0]} · {session.messages.length} mensajes
                              </span>
                            </button>
                            {session.id === activeSessionId ? (
                              <button
                                type="button"
                                onClick={deleteActiveSession}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted opacity-70 transition hover:bg-danger/10 hover:text-danger"
                                aria-label="Eliminar chat activo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        ))
                    )}
                  </div>
                  <div className="border-t border-border/65 p-3">
                    <button
                      type="button"
                      onClick={createNewSession}
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-border/75 bg-surface-2/65 text-xs font-medium text-text transition hover:border-accent/35 hover:bg-accent/10"
                    >
                      <Plus className="h-4 w-4" />
                      Nuevo chat
                    </button>
                  </div>
                </aside>
              </>
            ) : null}

            {memoryOpen ? (
              <>
                <button
                  type="button"
                  className="absolute inset-0 z-10 cursor-default bg-shadow/20"
                  aria-label="Cerrar memoria"
                  onClick={() => setMemoryOpen(false)}
                />
                <aside className="absolute inset-y-0 right-0 z-20 flex w-[min(94%,460px)] flex-col border-l border-border/75 bg-surface/98 shadow-2xl shadow-shadow/20">
                  <div className="flex items-start justify-between border-b border-border/65 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-accent" />
                        <p className="text-sm font-semibold text-text">Memoria de Synapse</p>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-muted">
                        Vista editable · {memoryProvider === "mem0+supabase" ? "Mem0 + Supabase" : "Supabase listo para Mem0"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMemoryOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
                      aria-label="Cerrar memoria"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="synapse-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
                    <div className="rounded-2xl border border-border/70 bg-surface-2/55 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-text">Lo que Synapse recuerda</p>
                          <p className="mt-0.5 text-[10px] text-muted">Cada viñeta representa un recuerdo independiente.</p>
                        </div>
                        {memoryLoading ? <LoaderCircle className="h-4 w-4 animate-spin text-accent" /> : null}
                      </div>
                      <textarea
                        value={memoryWiki}
                        onChange={(event) => setMemoryWiki(event.target.value)}
                        placeholder={memoryLoading ? "Cargando memoria…" : "Todavía no hay recuerdos guardados."}
                        spellCheck={false}
                        className="synapse-scrollbar min-h-[300px] w-full resize-y rounded-xl border border-border/65 bg-surface px-3 py-3 font-mono text-[11px] leading-5 text-text outline-none transition focus:border-accent/45 focus:ring-1 focus:ring-accent/15"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={saveMemoryWiki}
                          disabled={memoryLoading || memoryWiki === savedMemoryWiki}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[11px] font-medium text-accent-contrast disabled:opacity-45"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Guardar cambios
                        </button>
                        <button
                          type="button"
                          onClick={undoMemoryChange}
                          disabled={memoryLoading}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 px-3 text-[11px] text-muted hover:text-text disabled:opacity-45"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Deshacer
                        </button>
                        <button
                          type="button"
                          onClick={deleteAllMemory}
                          disabled={memoryLoading || !savedMemoryWiki}
                          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-45"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Borrar todo
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-border/70 bg-surface-2/55 p-3">
                      <p className="text-xs font-semibold text-text">Pedile un cambio</p>
                      <p className="mt-1 text-[10px] leading-4 text-muted">
                        Por ejemplo: “Olvidá mi preferencia anterior y recordá que quiero respuestas breves”.
                      </p>
                      <div className="mt-3 flex items-end gap-2 rounded-xl border border-border/65 bg-surface px-2.5 py-2 focus-within:border-accent/45">
                        <textarea
                          value={memoryCommand}
                          onChange={(event) => setMemoryCommand(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              void runMemoryCommand();
                            }
                          }}
                          rows={2}
                          placeholder="Actualizá, corregí u olvidá un recuerdo…"
                          className="min-h-[44px] flex-1 resize-none border-0 bg-transparent p-0 text-xs text-text outline-none placeholder:text-muted"
                        />
                        <button
                          type="button"
                          onClick={runMemoryCommand}
                          disabled={memoryLoading || !memoryCommand.trim()}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast disabled:opacity-45"
                          aria-label="Aplicar cambio de memoria"
                        >
                          <SendHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {memoryNotice ? (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/8 px-3 py-2 text-[11px] leading-5 text-muted">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                        {memoryNotice}
                      </div>
                    ) : null}
                  </div>
                </aside>
              </>
            ) : null}
          </div>

          <div className="border-t border-border/70 bg-surface/98 px-3 py-3 sm:px-5 sm:py-4">
            <div className="rounded-[1.35rem] border border-border/75 bg-surface-2/65 px-3 py-2 shadow-[inset_0_1px_0_rgb(var(--color-surface)/0.65)] focus-within:border-accent/45 focus-within:ring-1 focus-within:ring-accent/15 sm:px-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,.txt,.md,.csv,.json,.xml,.pdf,.docx,.xlsx"
                className="hidden"
                onChange={(event) => {
                  addAttachments(Array.from(event.target.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              {attachments.length ? (
                <div className="flex flex-wrap gap-1.5 border-b border-border/50 pb-2">
                  {attachments.map((file, index) => (
                    <span
                      key={`${file.name}-${file.size}-${index}`}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/65 bg-surface px-2 py-1 text-[10px] text-muted"
                    >
                      {file.type.startsWith("image/") ? (
                        <ImageIcon className="h-3 w-3 text-accent" />
                      ) : (
                        <FileText className="h-3 w-3 text-accent" />
                      )}
                      <span className="max-w-[180px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        className="rounded text-muted hover:text-danger"
                        aria-label={`Quitar ${file.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              {modelNotice ? (
                <p className="border-b border-border/45 py-1.5 text-[10px] text-accent">
                  {modelNotice}
                </p>
              ) : null}
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-text"
                  aria-label="Adjuntar archivo o imagen"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Preguntá sobre parciales, horarios, correlativas..."
                  rows={2}
                  style={{ borderColor: "transparent", boxShadow: "none" }}
                  className="min-h-[52px] w-full resize-none border-0 bg-transparent px-0 py-2 text-sm font-medium text-text shadow-none outline-none placeholder:text-muted focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none sm:min-h-[58px]"
                />
                <button
                  type="button"
                  onClick={isSending ? cancelSend : handleSend}
                  disabled={!isSending && !input.trim() && attachments.length === 0}
                  className={`mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${isSending
                    ? "border border-border/80 bg-surface text-muted hover:text-text"
                    : "bg-accent text-accent-contrast hover:brightness-105"
                    }`}
                  aria-label={isSending ? "Cancelar respuesta" : "Enviar mensaje"}
                >
                  {isSending ? <X className="h-4 w-4" /> : <SendHorizontal className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-2">
                <Select
                  hideChevron
                  value={selectedModelId}
                  onChange={(event) => selectModelOption(event.target.value)}
                  className="h-7 w-[min(100%,230px)] rounded-md border-0 bg-transparent bg-none px-0 py-0 text-[11px] font-medium text-muted shadow-none [color-scheme:dark] hover:text-text focus:border-transparent focus:ring-transparent"
                >
                  {modelOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.providerLabel} · {option.label}
                    </option>
                  ))}
                </Select>
                {!reasoningSelectorDisabled ? (
                  <Select
                    hideChevron
                    value={reasoningLevel}
                    onChange={(event) =>
                      setReasoningLevel(event.target.value as ReasoningLevel)
                    }
                    className="h-7 w-[108px] rounded-md border-0 bg-transparent bg-none px-0 py-0 text-[11px] font-medium text-muted shadow-none [color-scheme:dark] hover:text-text focus:border-transparent focus:ring-transparent"
                  >
                    {reasoningByIndex
                      .filter((level) => availableReasoningLevels.includes(level))
                      .map((level) => (
                        <option key={level} value={level}>
                          {reasoningLabelForModel(
                            currentModelOption.reasoningMode,
                            level,
                            currentModelOption.value
                          )}
                        </option>
                      ))}
                  </Select>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                    <Brain className="h-3 w-3" />
                    {currentModelOption.reasoningNote}
                  </span>
                )}
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted">
                  <Database className="h-3 w-3" />
                  {generationStatus
                    ? statusLabel[generationStatus]
                    : memoryProvider === "mem0+supabase"
                      ? "Memoria Mem0 activa"
                      : "Memoria preparada"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
