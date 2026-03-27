import { describe, expect, it } from "vitest";
import {
  deriveSessionTitle,
  restoreChatSessions,
  syncActiveSession,
  type ChatMessage,
  type ChatSession
} from "@/lib/chat/session-history";

const assistantMessage = (content: string): ChatMessage => ({
  id: `assistant-${content}`,
  role: "assistant",
  content,
  displayed: content
});

const userMessage = (content: string): ChatMessage => ({
  id: `user-${content}`,
  role: "user",
  content,
  displayed: content
});

const session = (overrides: Partial<ChatSession>): ChatSession => ({
  id: overrides.id ?? "session",
  title: overrides.title ?? "Chat sin título",
  threadId: overrides.threadId ?? null,
  messages: overrides.messages ?? [],
  updatedAt: overrides.updatedAt ?? 0
});

describe("chat session history helpers", () => {
  it("derives the title from the first user message and truncates it", () => {
    expect(
      deriveSessionTitle([
        assistantMessage("Hola"),
        userMessage(
          "   Este es un mensaje de usuario muy largo que debería truncarse con puntos suspensivos   "
        )
      ])
    ).toBe("Este es un mensaje de usuario muy largo que deberí…");
  });

  it("restores sessions with a fresh empty session first and keeps only non-empty history", () => {
    const restored = restoreChatSessions({
      raw: JSON.stringify([
        session({
          id: "older",
          title: "Viejo",
          messages: [userMessage("hola")],
          updatedAt: 10
        }),
        session({
          id: "empty",
          title: "Vacío",
          messages: [],
          updatedAt: 20
        }),
        { bogus: true }
      ]),
      now: 100,
      buildId: () => "fresh",
      maxStoredSessions: 4
    });

    expect(restored.activeSessionId).toBe("fresh");
    expect(restored.sessions.map((item) => item.id)).toEqual(["fresh", "older"]);
    expect(restored.sessions[0]?.messages).toEqual([]);
  });

  it("syncs the active session and keeps history sorted without dropping the active empty session", () => {
    const synced = syncActiveSession({
      sessions: [
        session({
          id: "active",
          title: "Anterior",
          messages: [],
          updatedAt: 10
        }),
        session({
          id: "history",
          title: "Con contenido",
          messages: [userMessage("hola")],
          updatedAt: 40
        }),
        session({
          id: "drop-me",
          title: "Vacía",
          messages: [],
          updatedAt: 20
        })
      ],
      activeSessionId: "active",
      messages: [userMessage("nuevo mensaje")],
      threadId: "thread-1",
      now: 80,
      maxStoredSessions: 4
    });

    expect(synced.map((item) => item.id)).toEqual(["active", "history"]);
    expect(synced[0]).toMatchObject({
      id: "active",
      title: "nuevo mensaje",
      threadId: "thread-1",
      updatedAt: 80
    });
  });
});
