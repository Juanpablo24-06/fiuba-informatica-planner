export type ChatStreamEvent =
  | { type: "status"; status: "recordando" | "pensando" | "respondiendo" | "guardando_memoria" }
  | { type: "reasoning_delta"; delta: string }
  | { type: "answer_delta"; delta: string }
  | { type: "error"; message: string; details?: string }
  | {
      type: "done";
      response: {
        answer: string;
        reasoning: string | null;
        warnings: string[];
        provider: string | null;
        model: string | null;
        reasoningMode: string | null;
      };
      actionResults: Array<{ type: string; ok: boolean; summary: string }>;
      memoriesStored: number;
      memoryProvider: "mem0+supabase" | "supabase";
      threadId: string | null;
      stored: boolean;
    };

export const encodeChatStreamEvent = (event: ChatStreamEvent) =>
  `${JSON.stringify(event)}\n`;

const decodePartialJsonString = (raw: string) => {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return null;
  }
};

export class JsonStringFieldStreamDecoder {
  private raw = "";
  private emitted = "";

  constructor(private readonly field: string) {}

  push(delta: string) {
    this.raw += delta;
    const escapedField = this.field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const key = this.raw.match(new RegExp(`"${escapedField}"\\s*:\\s*"`));
    if (!key || key.index === undefined) return "";
    const start = key.index + key[0].length;
    let escaped = false;
    let end = this.raw.length;
    for (let index = start; index < this.raw.length; index += 1) {
      const char = this.raw[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        end = index;
        break;
      }
    }
    const partialRaw = this.raw.slice(start, end);
    const decoded = decodePartialJsonString(partialRaw);
    if (decoded === null || decoded.length < this.emitted.length) return "";
    const next = decoded.slice(this.emitted.length);
    this.emitted = decoded;
    return next;
  }

  get text() {
    return this.emitted;
  }
}

export class JsonAnswerStreamDecoder extends JsonStringFieldStreamDecoder {
  constructor() {
    super("answer");
  }
}

export const parseChatStreamBuffer = (buffer: string) => {
  const lines = buffer.split(/\r?\n/);
  const remainder = lines.pop() ?? "";
  const events: ChatStreamEvent[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    events.push(JSON.parse(trimmed) as ChatStreamEvent);
  }
  return { events, remainder };
};
