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
import { Textarea } from "@/components/ui/textarea";
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
import {
  advanceStreamingMessage,
  getPreflightDelayMs,
  getStreamProfile
} from "@/lib/chat/streaming";
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
  const streamRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const canEditWithAI = role === "admin";
  const currentModelOption =
    modelOptions.find((option) => option.id === selectedModelId) ??
    defaultModelOption;
  const selectedModelOverride = selectedModel.trim();
  const availableReasoningLevels = currentModelOption.reasoningLevels;
  const reasoningSelectorDisabled = availableReasoningLevels.length === 0;
  const hasLiveReasoning = messages.some(
    (message) =>
      message.role === "assistant" &&
      message.isStreaming &&
      message.streamStage === "reasoning"
  );

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        window.clearInterval(streamRef.current);
        streamRef.current = null;
      }
    };
  }, []);

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

  const toggleReasoning = (messageId: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, reasoningOpen: !message.reasoningOpen }
          : message
      )
    );
  };

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

  const startStreaming = (messageId: string, level: ReasoningLevel) => {
    if (streamRef.current) {
      window.clearInterval(streamRef.current);
    }

    const profile = getStreamProfile(level);

    streamRef.current = window.setInterval(() => {
      let completed = false;

      setMessages((prev) => {
        const index = prev.findIndex((item) => item.id === messageId);
        if (index === -1) {
          completed = true;
          return prev;
        }
        const message = prev[index];
        if (message.role !== "assistant") {
          completed = true;
          return prev;
        }

        const next = [...prev];
        const advanced = advanceStreamingMessage(message, profile);
        completed = advanced.completed;
        next[index] = advanced.message;
        return next;
      });

      if (completed && streamRef.current) {
        window.clearInterval(streamRef.current);
        streamRef.current = null;
      }
    }, profile.intervalMs);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    setError(null);
    setInput("");

    setMessages((prev) => [
      ...prev,
      { id: buildChatId(), role: "user", content: trimmed, displayed: trimmed }
    ]);

    setIsSending(true);
    setIsThinking(true);

    const streamingLevel = reasoningLevel;

    try {
      const recentHistory: ChatRequestHistoryItem[] = [
        ...messages
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({
            role: message.role,
            content: message.content.trim().slice(0, 1200)
          }))
          .filter((message) => message.content.length > 0)
          .slice(-13),
        { role: "user", content: trimmed.slice(0, 1200) }
      ];

      const requestBody: Record<string, unknown> = {
        message: trimmed,
        storeHistory: storeHistory && persistenceEnabled,
        reasoningLevel: streamingLevel,
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

      const preflightDelay = getPreflightDelayMs(streamingLevel);
      if (preflightDelay > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, preflightDelay));
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
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
      const followUps = data?.response?.follow_up_questions?.length
        ? `Sugerencias: ${data.response.follow_up_questions.join(" / ")}`
        : "";
      const combined = [answer, warnings, followUps].filter(Boolean).join("\n\n");

      const reasoning =
        typeof data?.response?.reasoning === "string" &&
          data.response.reasoning.trim().length > 0
          ? data.response.reasoning.trim()
          : null;

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
          displayed: "",
          reasoning,
          displayedReasoning: "",
          streamStage: reasoning ? "reasoning" : "answer",
          reasoningOpen: Boolean(reasoning),
          actionResults,
          isStreaming: true
        }
      ]);
      startStreaming(assistantId, streamingLevel);
      setThreadId(data?.threadId ?? threadId);
    } catch {
      const message = "No se pudo contactar al asistente.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        { id: buildChatId(), role: "assistant", content: message, displayed: message }
      ]);
    } finally {
      setIsSending(false);
      setIsThinking(false);
    }
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
      <DialogContent className="h-[90svh] w-[96vw] max-w-[900px] overflow-hidden rounded-2xl border border-white/10 bg-[#08090f] p-0 text-slate-100 shadow-2xl sm:h-[84svh] sm:w-[92vw]">
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-accent">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-base font-semibold leading-tight text-white">
                      Synapse IA
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-400">
                      Asistente académico para agenda, cursada y decisiones rápidas.
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                <Select
                  hideChevron
                  value={activeSessionId ?? ""}
                  onChange={(event) => selectSession(event.target.value)}
                  disabled={!historyReady || sessions.length === 0}
                  className="h-8 w-[min(100%,190px)] rounded-lg border-white/10 bg-white/[0.06] px-2 py-0 text-[11px] text-slate-300 shadow-none hover:border-white/20 focus:border-accent/60 sm:w-[170px]"
                >
                  {sessions.length === 0 ? (
                    <option value="">Sin chats</option>
                  ) : (
                    sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {buildSessionLabel(session)}
                      </option>
                    ))
                  )}
                </Select>
                <button
                  type="button"
                  onClick={createNewSession}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 transition hover:border-white/20 hover:text-white"
                  aria-label="Nuevo chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
                {canEditWithAI ? (
                  <button
                    type="button"
                    onClick={() => setAllowActions((current) => !current)}
                    className={`h-8 shrink-0 rounded-lg border px-2.5 text-[11px] font-medium transition ${allowActions
                      ? "border-accent/55 bg-accent/15 text-accent"
                      : "border-white/10 bg-white/[0.06] text-slate-400 hover:border-white/20 hover:text-slate-100"
                      }`}
                  >
                    {allowActions ? "Acciones permitidas" : "Permitir acciones"}
                  </button>
                ) : null}
                {isThinking || hasLiveReasoning ? (
                  <div className="flex h-8 items-center gap-1.5 rounded-lg border border-accent/35 bg-accent/10 px-2 text-[11px] text-accent">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                    {hasLiveReasoning ? "Razonando" : "Pensando"}
                  </div>
                ) : null}
                <DialogClose asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 transition hover:border-white/20 hover:text-white"
                    aria-label="Cerrar Synapse"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm sm:px-5">
            {messages.length === 0 ? (
              <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center gap-5 py-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">
                    Preguntá por tu semana, parciales o prioridades.
                  </p>
                  <p className="max-w-lg text-xs leading-5 text-slate-400">
                    Synapse puede leer el contexto académico disponible y responder con pasos concretos.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs text-slate-300 transition hover:border-accent/45 hover:bg-accent/10 hover:text-white"
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
                  const content = message.isStreaming ? message.displayed : message.content;
                  const visibleReasoning =
                    message.streamStage === "reasoning"
                      ? message.displayedReasoning ?? ""
                      : message.reasoning ?? "";

                  return (
                    <div
                      key={message.id}
                      className={isUser ? "text-right" : "text-left"}
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <div
                        className={
                          isUser
                            ? "ml-auto max-w-[85%] animate-message-in rounded-2xl border border-accent/40 bg-accent/15 px-4 py-3 text-slate-100"
                            : "mr-auto max-w-[85%] animate-message-in rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100"
                        }
                      >
                        {!isUser && message.reasoning ? (
                          <div className="mb-3 rounded-xl border border-white/10 bg-black/20 p-2 text-[11px] text-slate-400">
                            <button
                              type="button"
                              className="w-full text-left text-[10px] uppercase tracking-[0.18em] text-slate-500"
                              onClick={() => toggleReasoning(message.id)}
                            >
                              {message.streamStage === "reasoning"
                                ? "Razonamiento en vivo"
                                : message.reasoningOpen
                                  ? "Ocultar razonamiento"
                                  : "Ver razonamiento"}
                            </button>
                            {message.reasoningOpen ? (
                              <p className="mt-2 whitespace-pre-wrap">{visibleReasoning}</p>
                            ) : null}
                          </div>
                        ) : null}

                        <p className="whitespace-pre-wrap">
                          {content || (message.streamStage === "reasoning" ? "Preparando respuesta..." : "")}
                        </p>

                        {!isUser && message.actionResults?.length ? (
                          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2 text-xs text-slate-400">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
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
              <div className="mr-auto max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:240ms]" />
                  Synapse está preparando el contexto...
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning">
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/10 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.focus()}
                  className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-transparent text-slate-400 transition hover:border-white/20 hover:text-white"
                  aria-label="Agregar contexto"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Preguntá sobre parciales, horarios, correlativas..."
                  rows={2}
                  className="min-h-[64px] resize-none rounded-xl border-white/10 bg-transparent px-0 py-2 text-sm text-slate-100 shadow-none placeholder:text-slate-500 focus:border-transparent focus:ring-transparent sm:min-h-[74px]"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || !input.trim()}
                  className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="Enviar mensaje"
                >
                  <SendHorizontal className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Select
                    hideChevron
                    value={selectedModelId}
                    onChange={(event) => selectModelOption(event.target.value)}
                    className="h-7 w-[min(100%,210px)] rounded-lg border-white/10 bg-white/[0.05] px-2 py-0 text-[11px] text-slate-300 shadow-none hover:border-white/20 focus:border-accent/60 sm:w-[210px]"
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
                      className="h-7 w-[118px] rounded-lg border-white/10 bg-white/[0.05] px-2 py-0 text-[11px] text-slate-300 shadow-none hover:border-white/20 focus:border-accent/60"
                    >
                      {reasoningByIndex
                        .filter((level) => availableReasoningLevels.includes(level))
                        .map((level) => (
                          <option key={level} value={level}>
                            Nivel {reasoningLabelByLevel[level]}
                          </option>
                        ))}
                    </Select>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-500">
                  {isSending ? "Enviando..." : currentModelOption.providerLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog >
  );
}
