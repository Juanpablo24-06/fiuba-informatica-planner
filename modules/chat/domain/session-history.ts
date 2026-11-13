import type { ChatMessage, ChatSession } from "@/modules/chat/domain/types";

export type { ChatMessage, ChatSession } from "@/modules/chat/domain/types";

export const CHAT_HISTORY_KEY = "synapse-chat-history-v2";
export const MAX_STORED_SESSIONS = 16;
const SESSION_TITLE_PREVIEW_LENGTH = 50;

export const buildChatId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const deriveSessionTitle = (messages: ChatMessage[]) => {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser?.content?.trim()) return "Chat sin título";

  const compact = firstUser.content.trim().replace(/\s+/g, " ");
  return compact.length > SESSION_TITLE_PREVIEW_LENGTH
    ? `${compact.slice(0, SESSION_TITLE_PREVIEW_LENGTH)}…`
    : compact;
};

export const buildEmptySession = ({
  id = buildChatId(),
  now = Date.now()
}: {
  id?: string;
  now?: number;
} = {}): ChatSession => ({
  id,
  title: "Chat sin título",
  threadId: null,
  messages: [],
  updatedAt: now
});

export const hasSessionContent = (session: ChatSession) =>
  session.messages.length > 0;

export const buildSessionLabel = (session: ChatSession) => {
  const date = new Date(session.updatedAt).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${date} · ${session.title}`;
};

const coerceStoredSession = (
  item: unknown,
  fallbackUpdatedAt: number
): ChatSession | null => {
  if (!item || typeof item !== "object") return null;

  const record = item as Partial<ChatSession>;
  if (typeof record.id !== "string") return null;

  return {
    id: record.id,
    title: record.title || "Chat sin título",
    threadId: record.threadId ?? null,
    messages: Array.isArray(record.messages) ? record.messages : [],
    updatedAt: Number(record.updatedAt) || fallbackUpdatedAt
  };
};

export const restoreChatSessions = ({
  raw,
  now = Date.now(),
  buildId = buildChatId,
  maxStoredSessions = MAX_STORED_SESSIONS
}: {
  raw: string | null;
  now?: number;
  buildId?: () => string;
  maxStoredSessions?: number;
}) => {
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const restored = Array.isArray(parsed)
      ? parsed
          .map((item) => coerceStoredSession(item, now))
          .filter((session): session is ChatSession => Boolean(session))
      : [];

    const nonEmptyHistory = restored
      .filter(hasSessionContent)
      .sort((first, second) => second.updatedAt - first.updatedAt)
      .slice(0, Math.max(0, maxStoredSessions - 1));

    const activeSession = buildEmptySession({
      id: buildId(),
      now
    });

    return {
      sessions: [activeSession, ...nonEmptyHistory],
      activeSessionId: activeSession.id,
      activeSession
    };
  } catch {
    const activeSession = buildEmptySession({
      id: buildId(),
      now
    });

    return {
      sessions: [activeSession],
      activeSessionId: activeSession.id,
      activeSession
    };
  }
};

export const syncActiveSession = ({
  sessions,
  activeSessionId,
  messages,
  threadId,
  now = Date.now(),
  maxStoredSessions = MAX_STORED_SESSIONS
}: {
  sessions: ChatSession[];
  activeSessionId: string;
  messages: ChatMessage[];
  threadId: string | null;
  now?: number;
  maxStoredSessions?: number;
}) => {
  const syncedSession: ChatSession = {
    id: activeSessionId,
    title: deriveSessionTitle(messages),
    threadId,
    messages,
    updatedAt: now
  };

  const sessionsWithActive = sessions.some(
    (session) => session.id === activeSessionId
  )
    ? sessions.map((session) =>
        session.id === activeSessionId ? syncedSession : session
      )
    : [syncedSession, ...sessions];

  return sessionsWithActive
    .filter(
      (session) =>
        hasSessionContent(session) || session.id === activeSessionId
    )
    .sort((first, second) => second.updatedAt - first.updatedAt)
    .slice(0, maxStoredSessions);
};

export const discardEmptyActiveSession = ({
  sessions,
  activeSessionId
}: {
  sessions: ChatSession[];
  activeSessionId: string | null;
}) => {
  if (!activeSessionId) return sessions;

  const activeSession = sessions.find(
    (session) => session.id === activeSessionId
  );
  if (!activeSession || hasSessionContent(activeSession)) {
    return sessions;
  }

  return sessions.filter((session) => session.id !== activeSessionId);
};

export const createFreshSession = ({
  sessions,
  now = Date.now(),
  buildId = buildChatId,
  maxStoredSessions = MAX_STORED_SESSIONS
}: {
  sessions: ChatSession[];
  now?: number;
  buildId?: () => string;
  maxStoredSessions?: number;
}) => {
  const activeSession = buildEmptySession({
    id: buildId(),
    now
  });
  const nextSessions = [activeSession, ...sessions.filter(hasSessionContent)]
    .sort((first, second) => second.updatedAt - first.updatedAt)
    .slice(0, maxStoredSessions);

  return {
    sessions: nextSessions,
    activeSession
  };
};

export const deleteSessionAndSelectFallback = ({
  sessions,
  activeSessionId,
  now = Date.now(),
  buildId = buildChatId
}: {
  sessions: ChatSession[];
  activeSessionId: string;
  now?: number;
  buildId?: () => string;
}) => {
  const remainingSessions = sessions.filter(
    (session) => session.id !== activeSessionId
  );
  const fallbackSession =
    remainingSessions[0] ??
    buildEmptySession({
      id: buildId(),
      now
    });

  return {
    sessions:
      remainingSessions.length > 0
        ? remainingSessions
        : [fallbackSession],
    activeSession: fallbackSession
  };
};
