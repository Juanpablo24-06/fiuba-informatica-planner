"use client";

import { useEffect, useRef, useState } from "react";
import { Gauge, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ReasoningLevel = "bajo" | "medio" | "alto";
type AIProvider = "auto" | "cerebras" | "nvidia" | "gemini";

type AssistantActionResult = {
  type: string;
  ok: boolean;
  summary: string;
};

type ChatRequestHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  displayed: string;
  reasoning?: string | null;
  displayedReasoning?: string;
  streamStage?: "reasoning" | "answer" | "done";
  reasoningOpen?: boolean;
  actionResults?: AssistantActionResult[];
  isStreaming?: boolean;
};

type ChatSession = {
  id: string;
  title: string;
  threadId: string | null;
  messages: ChatMessage[];
  updatedAt: number;
};

type StreamProfile = {
  intervalMs: number;
  reasoningStep: number;
  answerStep: number;
};

const persistenceEnabled = process.env.NEXT_PUBLIC_CHAT_PERSISTENCE === "true";
const CHAT_HISTORY_KEY = "synapse-chat-history-v2";
const MAX_STORED_SESSIONS = 16;
const CUSTOM_MODEL_VALUE = "__custom__";

const providerLabels: Record<AIProvider, string> = {
  auto: "Auto",
  cerebras: "Cerebras",
  nvidia: "NVIDIA",
  gemini: "Gemini"
};

const modelOptions: Record<
  Exclude<AIProvider, "auto">,
  Array<{ value: string; label: string }>
> = {
  cerebras: [
    { value: "", label: "Modelo por defecto (env)" },
    { value: "openai/gpt-oss-120b", label: "gpt-oss-120b" },
    { value: "openai/gpt-oss-20b", label: "gpt-oss-20b" },
    { value: CUSTOM_MODEL_VALUE, label: "Personalizado..." }
  ],
  nvidia: [
    { value: "", label: "Modelo por defecto (env)" },
    { value: "z-ai/glm4.7", label: "GLM 4.7" },
    { value: "z-ai/glm5", label: "GLM 5" },
    { value: "minimaxai/minimax-m2.5", label: "MiniMax M2.5" },
    { value: CUSTOM_MODEL_VALUE, label: "Personalizado..." }
  ],
  gemini: [
    { value: "", label: "Modelo por defecto (env)" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: CUSTOM_MODEL_VALUE, label: "Personalizado..." }
  ]
};

const reasoningIndexByLevel: Record<ReasoningLevel, number> = {
  bajo: 0,
  medio: 1,
  alto: 2
};

const reasoningByIndex: ReasoningLevel[] = ["bajo", "medio", "alto"];

const reasoningLabelByLevel: Record<ReasoningLevel, string> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto"
};

const buildId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getStreamProfile = (level: ReasoningLevel): StreamProfile => {
  if (level === "bajo") {
    return { intervalMs: 10, reasoningStep: 8, answerStep: 7 };
  }
  if (level === "alto") {
    return { intervalMs: 42, reasoningStep: 1, answerStep: 1 };
  }
  return { intervalMs: 22, reasoningStep: 4, answerStep: 3 };
};

const getPreflightDelayMs = (level: ReasoningLevel) => {
  if (level === "alto") return 1400;
  if (level === "medio") return 350;
  return 0;
};

const deriveSessionTitle = (messages: ChatMessage[]) => {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser?.content?.trim()) return "Chat sin título";
  const compact = firstUser.content.trim().replace(/\s+/g, " ");
  return compact.length > 48 ? `${compact.slice(0, 48)}…` : compact;
};

const buildEmptySession = (): ChatSession => ({
  id: buildId(),
  title: "Chat sin título",
  threadId: null,
  messages: [],
  updatedAt: Date.now()
});

const hasSessionContent = (session: ChatSession) => session.messages.length > 0;

const buildSessionLabel = (session: ChatSession) => {
  const date = new Date(session.updatedAt).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${date} · ${session.title}`;
};

const InlineToggle = ({
  checked,
  onChange,
  label,
  description,
  disabled = false
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface px-3 py-2 text-left text-xs text-text transition hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
  >
    <div>
      <p className="font-medium">{label}</p>
      {description ? <p className="mt-0.5 text-[11px] text-muted">{description}</p> : null}
    </div>
    <span
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition ${
        checked
          ? "border-accent/40 bg-accent/25"
          : "border-border/80 bg-surface-2"
      }`}
      aria-hidden="true"
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
          checked ? "left-[1.35rem]" : "left-0.5"
        }`}
      />
    </span>
  </button>
);

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
  const [showReasoningControl, setShowReasoningControl] = useState(false);
  const [provider, setProvider] = useState<AIProvider>("auto");
  const [selectedModel, setSelectedModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [allowActions, setAllowActions] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const streamRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const canEditWithAI = role === "admin" && allowActions;
  const modelSelectionEnabled = provider !== "auto";
  const providerModelOptions = provider === "auto" ? [] : modelOptions[provider];
  const selectedModelOverride =
    selectedModel === CUSTOM_MODEL_VALUE
      ? customModel.trim()
      : selectedModel.trim();
  const reasoningIndex = reasoningIndexByLevel[reasoningLevel];
  const reasoningHint =
    reasoningLevel === "alto"
      ? "Análisis más profundo, respuesta más lenta."
      : reasoningLevel === "medio"
        ? "Balance entre velocidad y detalle."
        : "Respuesta rápida con síntesis corta.";
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

  const handleReasoningSlider = (value: number) => {
    const safeValue = Math.min(2, Math.max(0, Math.round(value)));
    const nextLevel = reasoningByIndex[safeValue] ?? "medio";
    setReasoningLevel(nextLevel);
  };

  useEffect(() => {
    setSelectedModel("");
    setCustomModel("");
  }, [provider]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHAT_HISTORY_KEY);
      const restored = raw
        ? (JSON.parse(raw) as ChatSession[])
            .filter((item) => item && typeof item.id === "string")
            .map((item) => ({
              id: item.id,
              title: item.title || "Chat sin título",
              threadId: item.threadId ?? null,
              messages: Array.isArray(item.messages) ? item.messages : [],
              updatedAt: Number(item.updatedAt) || Date.now()
            }))
        : [];

      const nonEmptyHistory = restored
        .filter((session) => hasSessionContent(session))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_STORED_SESSIONS - 1);

      // Siempre abre en chat nuevo al recargar.
      const initial = buildEmptySession();
      const nextSessions = [initial, ...nonEmptyHistory];

      setSessions(nextSessions);
      setActiveSessionId(initial.id);
      setMessages([]);
      setThreadId(null);
      window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(nextSessions));
      setHistoryReady(true);
    } catch {
      const initial = buildEmptySession();
      setSessions([initial]);
      setActiveSessionId(initial.id);
      setMessages([]);
      setThreadId(null);
      setHistoryReady(true);
    }
  }, []);

  useEffect(() => {
    if (!historyReady || !activeSessionId) return;

    setSessions((prev) => {
      const now = Date.now();
      let next = prev.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              title: deriveSessionTitle(messages),
              threadId,
              messages,
              updatedAt: now
            }
          : session
      );

      if (!next.some((session) => session.id === activeSessionId)) {
        next = [
          {
            id: activeSessionId,
            title: deriveSessionTitle(messages),
            threadId,
            messages,
            updatedAt: now
          },
          ...next
        ];
      }

      next = next.filter(
        (session) =>
          hasSessionContent(session) || session.id === activeSessionId
      );

      next = next
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_STORED_SESSIONS);

      try {
        window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next));
      } catch {}
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
      if (!activeSessionId) return prev;
      const active = prev.find((session) => session.id === activeSessionId);
      if (!active || hasSessionContent(active)) return prev;
      return prev.filter((session) => session.id !== activeSessionId);
    });

    const selected = sessions.find((session) => session.id === sessionId);
    if (!selected) return;
    setActiveSessionId(selected.id);
    setMessages(selected.messages);
    setThreadId(selected.threadId);
    setError(null);
  };

  const createNewSession = () => {
    const nextSession = buildEmptySession();
    setActiveSessionId(nextSession.id);
    setMessages([]);
    setThreadId(null);
    setError(null);
    setSessions((prev) => {
      const next = [nextSession, ...prev.filter((session) => hasSessionContent(session))]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_STORED_SESSIONS);
      try {
        window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const deleteActiveSession = () => {
    if (!activeSessionId) return;
    setSessions((prev) => {
      const next = prev.filter((session) => session.id !== activeSessionId);
      const fallback = next[0] ?? buildEmptySession();
      const normalized = next.length > 0 ? next : [fallback];
      setActiveSessionId(fallback.id);
      setMessages(fallback.messages);
      setThreadId(fallback.threadId);
      setError(null);
      try {
        window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(normalized));
      } catch {}
      return normalized;
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

        if (message.streamStage === "reasoning" && message.reasoning) {
          const currentLength = message.displayedReasoning?.length ?? 0;
          const nextLength = Math.min(
            currentLength + profile.reasoningStep,
            message.reasoning.length
          );
          const reasoningDone = nextLength >= message.reasoning.length;

          next[index] = {
            ...message,
            displayedReasoning: message.reasoning.slice(0, nextLength),
            streamStage: reasoningDone ? "answer" : "reasoning",
            reasoningOpen: reasoningDone ? false : true,
            isStreaming: true
          };
          return next;
        }

        const currentLength = message.displayed.length;
        const nextLength = Math.min(
          currentLength + profile.answerStep,
          message.content.length
        );
        const answerDone = nextLength >= message.content.length;
        completed = answerDone;

        next[index] = {
          ...message,
          displayed: message.content.slice(0, nextLength),
          streamStage: answerDone ? "done" : "answer",
          isStreaming: !answerDone
        };
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
      { id: buildId(), role: "user", content: trimmed, displayed: trimmed }
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
        allowActions: role === "admin" ? allowActions : false,
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
          { id: buildId(), role: "assistant", content: message, displayed: message }
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

      const assistantId = buildId();
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
        { id: buildId(), role: "assistant", content: message, displayed: message }
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
      <DialogContent className="h-[84svh] w-[94vw] max-w-[920px] overflow-hidden rounded-[2.1rem] border border-border/75 bg-surface p-0">
        <div className="flex h-full flex-col">
          <DialogHeader className="space-y-0 border-b border-border/60 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-[1.3rem] leading-tight">Synapse IA</DialogTitle>
                <p className="mt-0.5 text-xs text-muted">
                  Contexto FIUBA · {role === "admin" ? "modo admin" : "modo lectura"}
                </p>

                <div className="mt-2 grid max-w-[560px] gap-2 sm:grid-cols-2">
                  <Select
                    value={provider}
                    onChange={(event) => setProvider(event.target.value as AIProvider)}
                    className="h-9 rounded-xl py-1.5 text-xs"
                  >
                    <option value="auto">Proveedor: Auto</option>
                    <option value="cerebras">Proveedor: Cerebras</option>
                    <option value="nvidia">Proveedor: NVIDIA</option>
                    <option value="gemini">Proveedor: Gemini</option>
                  </Select>

                  <Select
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                    className="h-9 rounded-xl py-1.5 text-xs"
                    disabled={!modelSelectionEnabled}
                  >
                    {!modelSelectionEnabled ? (
                      <option value="">Modelo: automático por proveedor</option>
                    ) : (
                      providerModelOptions.map((option) => (
                        <option key={`${provider}-${option.value || "default"}`} value={option.value}>
                          Modelo: {option.label}
                        </option>
                      ))
                    )}
                  </Select>
                </div>

                {modelSelectionEnabled && selectedModel === CUSTOM_MODEL_VALUE ? (
                  <input
                    type="text"
                    value={customModel}
                    onChange={(event) => setCustomModel(event.target.value)}
                    className="mt-2 h-9 w-full max-w-[560px] rounded-xl border border-border/70 bg-surface px-3 text-xs text-text outline-none transition focus:border-accent/60"
                    placeholder="Ej: z-ai/glm5"
                  />
                ) : null}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
                    Activo: {providerLabels[provider]}
                    {modelSelectionEnabled && selectedModelOverride
                      ? ` · ${selectedModelOverride}`
                      : ""}
                  </span>
                  {role === "admin" ? (
                    <span className="rounded-full border border-border/70 bg-surface px-2.5 py-1 text-[11px] text-muted">
                      {canEditWithAI ? "Permiso: edición" : "Permiso: solo consulta"}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isThinking || hasLiveReasoning ? (
                  <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] text-accent">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                    {hasLiveReasoning ? "Razonando en vivo" : "Consultando"}
                  </div>
                ) : null}
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-full border border-border/70 bg-surface-2 p-2 text-muted transition hover:text-text"
                    aria-label="Cerrar Synapse"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
            <div className="rounded-2xl border border-border/70 bg-surface-2/95 p-2.5 text-xs text-muted">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                <Select
                  value={activeSessionId ?? ""}
                  onChange={(event) => selectSession(event.target.value)}
                  disabled={!historyReady || sessions.length === 0}
                  className="h-9 rounded-xl py-1.5 text-xs"
                >
                  {sessions.length === 0 ? (
                    <option value="">Historial: sin chats</option>
                  ) : (
                    sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {buildSessionLabel(session)}
                      </option>
                    ))
                  )}
                </Select>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={createNewSession}
                  className="h-9 px-3"
                >
                  Nuevo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={deleteActiveSession}
                  disabled={!activeSessionId}
                  className="h-9 px-2.5 text-[11px]"
                >
                  Borrar
                </Button>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {role === "admin" ? (
                  <InlineToggle
                    checked={allowActions}
                    onChange={setAllowActions}
                    label="Permitir acciones de edición"
                    description={canEditWithAI ? "La IA puede aplicar cambios." : "La IA solo consulta."}
                  />
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-surface px-3 py-2 text-[11px] text-muted">
                    Usuario viewer: solo lectura.
                  </div>
                )}
                <InlineToggle
                  checked={storeHistory}
                  onChange={setStoreHistory}
                  label="Guardar historial en Supabase"
                  description={
                    persistenceEnabled
                      ? "Disponible para continuidad entre sesiones."
                      : "Desactivado por configuración del entorno."
                  }
                  disabled={!persistenceEnabled}
                />
              </div>
            </div>

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

          <div className="border-t border-border/60 px-6 py-5">
            <div className="space-y-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej: ¿Qué parciales tengo esta semana?"
                rows={3}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowReasoningControl((prev) => !prev)}
                    className="h-8 rounded-full border border-border/70 bg-surface px-3 text-[11px]"
                  >
                    <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                    Razonamiento: {reasoningLabelByLevel[reasoningLevel]}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMessages([]);
                      setThreadId(null);
                      setError(null);
                    }}
                  >
                    Limpiar chat actual
                  </Button>
                </div>
                <Button size="sm" onClick={handleSend} disabled={isSending || !input.trim()}>
                  {isSending ? "Enviando..." : "Enviar"}
                </Button>
              </div>

              {showReasoningControl ? (
                <div className="rounded-2xl border border-border/70 bg-surface-2/90 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <p className="uppercase tracking-[0.2em] text-muted">
                      Nivel de razonamiento
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-accent/35 bg-accent/12 px-2 py-0.5 text-accent">
                      <Gauge className="h-3.5 w-3.5" />
                      {reasoningLabelByLevel[reasoningLevel]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={1}
                    value={reasoningIndex}
                    onChange={(event) => handleReasoningSlider(Number(event.target.value))}
                    className="ai-range mt-2.5 w-full"
                    aria-label="Nivel de razonamiento"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    {reasoningByIndex.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setReasoningLevel(level)}
                        className={`rounded-full px-2 py-0.5 transition ${
                          reasoningLevel === level
                            ? "bg-accent/15 text-accent"
                            : "text-muted hover:text-text"
                        }`}
                      >
                        {reasoningLabelByLevel[level]}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">{reasoningHint}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
