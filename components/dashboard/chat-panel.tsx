"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ReasoningLevel = "bajo" | "medio" | "alto";

type AssistantActionResult = {
  type: string;
  ok: boolean;
  summary: string;
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

const persistenceEnabled = process.env.NEXT_PUBLIC_CHAT_PERSISTENCE === "true";
const buildId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
  const streamRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const canEditWithAI = role === "admin" && allowActions;
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

  const toggleReasoning = (messageId: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, reasoningOpen: !message.reasoningOpen }
          : message
      )
    );
  };

  const startStreaming = (messageId: string) => {
    if (streamRef.current) {
      window.clearInterval(streamRef.current);
    }

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
          const nextLength = Math.min(currentLength + 4, message.reasoning.length);
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
        const nextLength = Math.min(currentLength + 3, message.content.length);
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
    }, 18);
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

    try {
      const requestBody: Record<string, unknown> = {
        message: trimmed,
        storeHistory: storeHistory && persistenceEnabled,
        reasoningLevel,
        allowActions: role === "admin" ? allowActions : false
      };
      if (threadId) {
        requestBody.threadId = threadId;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.error ?? "No se pudo responder.";
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
      startStreaming(assistantId);
      setThreadId(data?.threadId ?? threadId);
    } catch (err) {
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
          <DialogHeader className="flex items-center justify-between gap-3 space-y-0 border-b border-border/60 px-6 py-5">
            <div>
              <DialogTitle>Synapse IA</DialogTitle>
              <p className="text-xs text-muted">
                Contexto FIUBA · {role === "admin" ? "modo admin" : "modo lectura"}
              </p>
            </div>
            {isThinking || hasLiveReasoning ? (
              <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] text-accent">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                {hasLiveReasoning ? "Razonando en vivo" : "Consultando contexto"}
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
          </DialogHeader>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm">
            <div className="rounded-2xl border border-border/70 bg-surface-2 p-3 text-xs text-muted">
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-muted">
                    Nivel de razonamiento
                  </p>
                  <Select
                    value={reasoningLevel}
                    onChange={(event) =>
                      setReasoningLevel(event.target.value as ReasoningLevel)
                    }
                    className="mt-1.5"
                  >
                    <option value="bajo">Bajo · más rápido</option>
                    <option value="medio">Medio · equilibrado</option>
                    <option value="alto">Alto · más profundo</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.26em] text-muted">Permisos</p>
                  {role === "admin" ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allowActions}
                        onChange={(event) => setAllowActions(event.target.checked)}
                      />
                      Permitir acciones de edición en la base
                    </label>
                  ) : (
                    <p>Usuario viewer: solo lectura, sin cambios sobre datos.</p>
                  )}
                  {role === "admin" ? (
                    <p className="text-[11px] text-muted">
                      Estado actual:{" "}
                      <span className="font-semibold text-text">
                        {canEditWithAI ? "puede editar" : "solo consulta"}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 border-t border-border/60 pt-3">
                {persistenceEnabled ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={storeHistory}
                      onChange={(event) => setStoreHistory(event.target.checked)}
                    />
                    Guardar historial en Supabase
                  </label>
                ) : (
                  <p>Historial solo local (activar persistencia en env).</p>
                )}
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
                <Button variant="outline" size="sm" onClick={() => setMessages([])}>
                  Limpiar
                </Button>
                <Button size="sm" onClick={handleSend} disabled={isSending || !input.trim()}>
                  {isSending ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
