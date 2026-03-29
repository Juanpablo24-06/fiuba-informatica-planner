"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
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
const CUSTOM_MODEL_VALUE = "__custom__";

const modelOptions: Record<
  Exclude<AIProvider, "auto">,
  Array<{ value: string; label: string }>
> = {
  cerebras: [
    { value: "openai/gpt-oss-120b", label: "gpt-oss-120b" },
    { value: "openai/gpt-oss-20b", label: "gpt-oss-20b" }
  ],
  nvidia: [
    { value: "z-ai/glm4.7", label: "GLM 4.7" },
    { value: "z-ai/glm5", label: "GLM 5" },
    { value: "minimaxai/minimax-m2.5", label: "MiniMax M2.5" }
  ],
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" }
  ]
};

const reasoningByIndex: ReasoningLevel[] = ["bajo", "medio", "alto"];

const reasoningLabelByLevel: Record<ReasoningLevel, string> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto"
};

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
  const [storeHistory, setStoreHistory] = useState(persistenceEnabled);
  const [reasoningLevel, setReasoningLevel] = useState<ReasoningLevel>("medio");
  const [allowActions, setAllowActions] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("cerebras");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-120b");
  const [customModel, setCustomModel] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const streamRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const canEditWithAI = role === "admin";
  const selectedModelOverride =
    selectedModel === CUSTOM_MODEL_VALUE
      ? customModel.trim()
      : selectedModel.trim();
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
    setSelectedModel("");
    setCustomModel("");
  }, [provider]);

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
      <DialogContent className="h-[88svh] w-[96vw] max-w-[920px] overflow-hidden rounded-[1.75rem] border border-border/75 bg-surface p-0 sm:h-[84svh] sm:w-[94vw] sm:rounded-[2.1rem]">
        <div className="flex h-full flex-col">
          <DialogHeader className="space-y-0 border-b border-border/60 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <DialogTitle className="text-base font-semibold leading-tight whitespace-nowrap">Synapse IA</DialogTitle>
                <DialogDescription className="sr-only">
                  Chat académico para consultar semana, parciales, correlativas y prioridades desde el celular o escritorio.
                </DialogDescription>

                <Select
                  hideChevron
                  value={activeSessionId ?? ""}
                  onChange={(event) => selectSession(event.target.value)}
                  disabled={!historyReady || sessions.length === 0}
                  className="h-7 min-w-0 flex-1 rounded-lg border-border/40 bg-surface-2/80 px-2 py-0 text-[10px] text-muted transition sm:w-[130px] sm:flex-none"
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
                  className="shrink-0 rounded-lg border border-border/40 bg-surface-2/80 px-1.5 py-0.5 text-[10px] text-muted transition hover:text-text"
                >
                  +
                </button>

                {isThinking || hasLiveReasoning ? (
                  <div className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                    {hasLiveReasoning ? "Razonando" : "Pensando"}
                  </div>
                ) : null}
              </div>

              <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:justify-end">
                <Select
                  hideChevron
                  value={`${provider}:${selectedModel}`}
                  onChange={(event) => {
                    const [newProvider, newModel] = event.target.value.split(":") as [AIProvider, string];
                    setProvider(newProvider);
                    setSelectedModel(newModel);
                  }}
                  className="h-7 min-w-0 flex-1 rounded-lg border-border/40 bg-surface-2/80 px-2 py-0 text-[10px] text-muted transition hover:text-text sm:flex-none"
                >
                  <optgroup label="Cerebras">
                    {modelOptions.cerebras.map((option) => (
                      <option key={`cerebras:${option.value}`} value={`cerebras:${option.value}`}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="NVIDIA">
                    {modelOptions.nvidia.map((option) => (
                      <option key={`nvidia:${option.value}`} value={`nvidia:${option.value}`}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                </Select>

                <DialogClose asChild>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-border/40 bg-surface-2/80 p-1.5 text-muted transition hover:text-text"
                    aria-label="Cerrar Synapse"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm sm:px-5">
            {messages.length === 0 ? (
              <div className="rounded-3xl border border-border/70 bg-surface-2 p-4 text-xs text-muted">
                Preguntá por tu semana, parciales o prioridades. Si sos admin, podés habilitar acciones para que Synapse aplique cambios.
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
                            ? "ml-auto max-w-[85%] animate-message-in rounded-3xl border border-accent/45 bg-accent/18 px-4 py-3 text-text"
                            : "mr-auto max-w-[85%] animate-message-in rounded-3xl border border-border/70 bg-surface-2 px-4 py-3 text-text"
                        }
                      >
                        {!isUser && message.reasoning ? (
                          <div className="mb-3 rounded-2xl border border-border/60 bg-surface/80 p-2 text-[11px] text-muted">
                            <button
                              type="button"
                              className="w-full text-left text-[10px] uppercase tracking-[0.28em] text-muted"
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
                          <div className="mt-3 rounded-2xl border border-border/60 bg-surface/70 p-2 text-xs text-muted">
                            <p className="text-[10px] uppercase tracking-[0.26em] text-muted">
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
              <div className="mr-auto max-w-[85%] rounded-3xl border border-border/70 bg-surface-2 px-4 py-3 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:240ms]" />
                  Synapse está preparando el contexto...
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning">
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-border/60 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-wrap gap-1.5 sm:flex-col">
                {reasoningByIndex.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setReasoningLevel(level)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-200 border whitespace-nowrap ${reasoningLevel === level
                      ? "bg-accent/15 text-accent border-accent/40"
                      : "text-muted hover:text-text border-transparent hover:border-border/50"
                      }`}
                  >
                    {reasoningLabelByLevel[level]}
                  </button>
                ))}
                {canEditWithAI ? (
                  <button
                    type="button"
                    onClick={() => setAllowActions((current) => !current)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-200 border whitespace-nowrap ${allowActions
                      ? "bg-accent/15 text-accent border-accent/40"
                      : "text-muted hover:text-text border-border/40"
                      }`}
                  >
                    {allowActions ? "Acciones activas" : "Acciones apagadas"}
                  </button>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Preguntá sobre parciales, horarios, correlativas..."
                  rows={2}
                  className="min-h-[88px] sm:min-h-[100px]"
                />
              </div>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={isSending || !input.trim()}
                className="w-full sm:w-auto shrink-0"
              >
                {isSending ? "..." : "Enviar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog >
  );
}
