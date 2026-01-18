"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  displayed: string;
  reasoning?: string | null;
  isStreaming?: boolean;
};

const persistenceEnabled = process.env.NEXT_PUBLIC_CHAT_PERSISTENCE === "true";
const buildId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function ChatPanel({ trigger }: { trigger?: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [storeHistory, setStoreHistory] = useState(persistenceEnabled);
  const streamRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        window.clearInterval(streamRef.current);
        streamRef.current = null;
      }
    };
  }, []);

  const startStreaming = (messageId: string) => {
    if (streamRef.current) {
      window.clearInterval(streamRef.current);
    }
    streamRef.current = window.setInterval(() => {
      let done = false;
      setMessages((prev) => {
        const index = prev.findIndex((item) => item.id === messageId);
        if (index === -1) {
          done = true;
          return prev;
        }
        const message = prev[index];
        const currentLength = message.displayed.length;
        const nextLength = Math.min(currentLength + 2, message.content.length);
        done = nextLength >= message.content.length;
        const next = [...prev];
        next[index] = {
          ...message,
          displayed: message.content.slice(0, nextLength),
          isStreaming: !done
        };
        return next;
      });
      if (done && streamRef.current) {
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
        storeHistory: storeHistory && persistenceEnabled
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
      const assistantId = buildId();

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: combined,
          displayed: "",
          reasoning: data?.response?.reasoning ?? null,
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
      handleSend();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Sparkles className="mr-2 h-4 w-4" />
            Synapse IA
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="left-auto right-0 top-0 h-[100svh] w-full max-w-none translate-x-0 translate-y-0 rounded-none border-l border-white/[0.12] bg-surface/95 p-0 sm:w-[420px]">
        <div className="flex h-full flex-col">
          <DialogHeader className="flex items-center justify-between gap-3 space-y-0 border-b border-white/[0.08] px-5 py-4">
            <div>
              <DialogTitle>Synapse IA</DialogTitle>
              <p className="text-xs text-muted">Contexto FIUBA · Respuestas en JSON</p>
            </div>
            {isThinking ? (
              <div className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] text-accent">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                Pensando
              </div>
            ) : null}
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
            <div className="rounded-2xl border border-white/[0.12] bg-surface/85 p-3 text-xs text-muted">
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

            {messages.length === 0 ? (
              <div className="rounded-3xl border border-white/[0.12] bg-surface/85 p-4 text-xs text-muted">
                Preguntá por tu semana, parciales o prioridades. Synapse responde con contexto.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  const content = message.isStreaming ? message.displayed : message.content;
                  return (
                    <div key={message.id} className={isUser ? "text-right" : "text-left"}>
                      <div
                        className={
                          isUser
                            ? "ml-auto max-w-[85%] rounded-3xl border border-accent/40 bg-accent/10 px-4 py-3 text-text"
                            : "mr-auto max-w-[85%] rounded-3xl border border-white/[0.12] bg-surface/85 px-4 py-3 text-text"
                        }
                      >
                        <p className="whitespace-pre-wrap">{content}</p>
                        {message.reasoning ? (
                          <details className="mt-3 rounded-2xl border border-white/[0.12] bg-surface/85 p-2 text-[11px] text-muted">
                            <summary className="cursor-pointer select-none text-[10px] uppercase tracking-[0.3em] text-muted">
                              Razonamiento
                            </summary>
                            <p className="mt-2 whitespace-pre-wrap">{message.reasoning}</p>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {error ? (
              <div className="rounded-2xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/[0.08] px-5 py-4">
            <div className="space-y-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej: Que parciales tengo esta semana?"
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
