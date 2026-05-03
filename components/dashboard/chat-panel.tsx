"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, SendHorizontal, Sparkles, X } from "lucide-react";
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
  CHAT_HISTORY_KEY,
  buildChatId,
  buildSessionLabel,
  createFreshSession,
  deleteSessionAndSelectFallback,
  discardEmptyActiveSession,
  restoreChatSessions,
  syncActiveSession
} from "@/lib/chat/session-history";
import type {
  AIProvider,
  AssistantActionResult,
  ChatMessage,
  ChatRequestHistoryItem,
  ChatSession,
  ReasoningLevel
} from "@/lib/chat/types";

const persistenceEnabled = process.env.NEXT_PUBLIC_CHAT_PERSISTENCE === "true";
type ChatModelOption = {
  id: string;
  provider: Exclude<AIProvider, "auto">;
  providerLabel: string;
  value: string;
  label: string;
  reasoningLevels: ReasoningLevel[];
};

const modelOptions: ChatModelOption[] = [
  {
    id: "openrouter-gpt-oss-120b-free",
    provider: "openrouter",
    providerLabel: "OpenRouter",
    value: "openai/gpt-oss-120b:free",
    label: "GPT-OSS 120B Free",
    reasoningLevels: ["bajo", "medio", "alto"]
  },
  {
    id: "nvidia-glm47",
    provider: "nvidia",
    providerLabel: "NVIDIA",
    value: "z-ai/glm4.7",
    label: "GLM 4.7",
    reasoningLevels: ["bajo", "medio", "alto"]
  },
  {
    id: "nvidia-glm5",
    provider: "nvidia",
    providerLabel: "NVIDIA",
    value: "z-ai/glm5",
    label: "GLM 5",
    reasoningLevels: ["medio", "alto"]
  },
  {
    id: "nvidia-minimax-m25",
    provider: "nvidia",
    providerLabel: "NVIDIA",
    value: "minimaxai/minimax-m2.5",
    label: "MiniMax M2.5",
    reasoningLevels: ["bajo", "medio"]
  },
  {
    id: "gemini-20-flash",
    provider: "gemini",
    providerLabel: "Gemini",
    value: "gemini-2.0-flash",
    label: "2.0 Flash",
    reasoningLevels: ["bajo", "medio"]
  },
  {
    id: "gemini-20-flash-lite",
    provider: "gemini",
    providerLabel: "Gemini",
    value: "gemini-2.0-flash-lite",
    label: "2.0 Flash Lite",
    reasoningLevels: ["bajo"]
  },
  {
    id: "gemini-15-pro",
    provider: "gemini",
    providerLabel: "Gemini",
    value: "gemini-1.5-pro",
    label: "1.5 Pro",
    reasoningLevels: ["medio", "alto"]
  }
];

const defaultModelOption = modelOptions[0];

const reasoningByIndex: ReasoningLevel[] = ["bajo", "medio", "alto"];

const reasoningLabelByLevel: Record<ReasoningLevel, string> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto"
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
  const requestAbortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    setError(null);
    setInput("");

    const nextUserMessage: ChatMessage = {
      id: buildChatId(),
      role: "user",
      content: trimmed,
      displayed: trimmed
    };
    const messagesForRequest = [...messages, nextUserMessage];

    setMessages((prev) => [
      ...prev,
      nextUserMessage
    ]);

    setIsSending(true);
    setIsThinking(true);

    const controller = new AbortController();
    requestAbortRef.current = controller;

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

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = [data?.error, data?.details, data?.instructions]
          .filter((part) => typeof part === "string" && part.trim().length > 0)
          .join(" · ") || "No se pudo responder.";
        setError(message);
        setMessages((prev) => [
          ...prev,
          { id: buildChatId(), role: "assistant", content: message, displayed: message }
        ]);
        return;
      }

      const answer = data?.response?.answer ?? data?.message ?? "Sin respuesta.";
      const warnings = data?.response?.warnings?.length
        ? `Avisos: ${data.response.warnings.join(" / ")}`
        : "";
      const combined = [answer, warnings].filter(Boolean).join("\n\n");

      const actionResults = Array.isArray(data?.actionResults)
        ? (data.actionResults as AssistantActionResult[])
        : [];

      const assistantId = buildChatId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: combined,
          displayed: combined,
          actionResults,
        }
      ]);
      setThreadId(data?.threadId ?? threadId);
    } catch (caughtError) {
      if (caughtError instanceof Error && caughtError.name === "AbortError") {
        return;
      }
      const message = "No se pudo contactar al asistente.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        { id: buildChatId(), role: "assistant", content: message, displayed: message }
      ]);
    } finally {
      if (requestAbortRef.current === controller) {
        requestAbortRef.current = null;
      }
      setIsSending(false);
      setIsThinking(false);
    }
  };

  const cancelSend = () => {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    setIsSending(false);
    setIsThinking(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const selectModelOption = (modelId: string) => {
    const option =
      modelOptions.find((candidate) => candidate.id === modelId) ??
      defaultModelOption;
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
        className="h-[88svh] w-[95vw] max-w-[880px] overflow-hidden rounded-[1.35rem] border border-border/80 bg-surface/95 p-0 text-text shadow-2xl shadow-shadow/20 backdrop-blur-xl sm:h-[80svh] sm:w-[90vw]"
      >
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b border-border/70 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <DialogTitle className="truncate text-base font-semibold leading-tight text-text">
                      Synapse IA
                    </DialogTitle>
                    <Select
                      hideChevron
                      value={activeSessionId ?? ""}
                      onChange={(event) => selectSession(event.target.value)}
                      disabled={!historyReady || sessions.length === 0}
                      className="h-6 w-[170px] rounded-md border-transparent bg-transparent bg-none px-0 py-0 text-[11px] font-medium text-muted shadow-none hover:text-text focus:border-transparent focus:ring-transparent"
                    >
                      {sessions.length === 0 ? (
                        <option value="">Chat sin título</option>
                      ) : (
                        sessions.map((session) => (
                          <option key={session.id} value={session.id}>
                            {buildSessionLabel(session)}
                          </option>
                        ))
                      )}
                    </Select>
                  </div>
                  <DialogDescription className="max-w-[38rem] text-xs leading-5 text-muted">
                    Asistente académico para agenda, cursada y decisiones rápidas.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex min-w-0 items-center justify-end gap-2">
                {canEditWithAI ? (
                  <button
                    type="button"
                    onClick={() => setAllowActions((current) => !current)}
                    className={`h-8 shrink-0 rounded-full border px-3 text-[11px] font-medium transition ${allowActions
                      ? "border-accent/45 bg-accent/12 text-accent"
                      : "border-border/70 bg-surface-2/65 text-muted hover:border-accent/30 hover:text-text"
                      }`}
                  >
                    {allowActions ? "Acciones permitidas" : "Permitir acciones"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={createNewSession}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text"
                  aria-label="Nuevo chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text"
                    aria-label="Cerrar Synapse"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 text-sm sm:px-5">
            {messages.length === 0 ? (
              <div className="mx-auto flex min-h-full w-full max-w-[620px] flex-col justify-center gap-5 py-4">
                <div className="space-y-2">
                  <p className="text-lg font-semibold leading-tight text-text">
                    Preguntá por tu semana, parciales o prioridades.
                  </p>
                  <p className="max-w-lg text-sm leading-6 text-muted">
                    Synapse lee tu contexto académico disponible y responde con pasos concretos.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="rounded-xl border border-border/75 bg-surface-2/70 px-3 py-2.5 text-left text-xs leading-5 text-text transition hover:border-accent/40 hover:bg-accent/10"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
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
                            ? "ml-auto max-w-[78%] animate-message-in rounded-2xl border border-accent/35 bg-accent/12 px-4 py-3 text-text"
                            : "mr-auto max-w-[82%] animate-message-in rounded-2xl border border-border/70 bg-surface-2/75 px-4 py-3 text-text"
                        }
                      >
                        <p className="whitespace-pre-wrap leading-6">
                          {message.content || "Preparando respuesta..."}
                        </p>

                        {!isUser && message.actionResults?.length ? (
                          <div className="mt-3 rounded-xl border border-border/70 bg-surface/75 p-2 text-xs text-muted">
                            <p className="text-[10px] font-semibold uppercase text-muted">
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

            {isThinking ? (
              <div className="mr-auto mt-3 max-w-[82%] rounded-2xl border border-border/70 bg-surface-2/75 px-4 py-3 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:240ms]" />
                  Esperando respuesta del modelo...
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning">
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-border/70 bg-surface/98 px-3 py-3 sm:px-4">
            <div className="rounded-2xl border border-border/75 bg-surface-2/65 px-3 py-2 shadow-[inset_0_1px_0_rgb(var(--color-surface)/0.65)] focus-within:border-accent/45">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.focus()}
                  className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-text"
                  aria-label="Agregar contexto"
                >
                  <Plus className="h-4 w-4" />
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
                  disabled={!isSending && !input.trim()}
                  className={`mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${isSending
                    ? "border border-border/80 bg-surface text-muted hover:text-text"
                    : "bg-accent text-accent-contrast hover:brightness-105"
                    }`}
                  aria-label={isSending ? "Cancelar respuesta" : "Enviar mensaje"}
                >
                  {isSending ? <X className="h-4 w-4" /> : <SendHorizontal className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border/50 pt-2">
                <Select
                  hideChevron
                  value={selectedModelId}
                  onChange={(event) => selectModelOption(event.target.value)}
                  className="h-7 w-[min(100%,210px)] rounded-md border-0 bg-transparent bg-none px-0 py-0 text-[11px] font-medium text-muted shadow-none [color-scheme:dark] hover:text-text focus:border-transparent focus:ring-transparent"
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
                          {reasoningLabelByLevel[level]}
                        </option>
                      ))}
                  </Select>
                ) : null}
                <span className="ml-auto text-[11px] text-muted">
                  {isSending ? "Enviando..." : currentModelOption.providerLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog >
  );
}
