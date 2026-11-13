import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { callNvidiaJSON, callNvidiaJSONStream } from "@/lib/ai/nvidia";

const schema = z.object({ answer: z.string() });
const ORIGINAL_ENV = process.env;

const getRequestBody = (fetchMock: ReturnType<typeof vi.fn>) => {
  const call = fetchMock.mock.calls[0] as [string, RequestInit] | undefined;
  if (!call?.[1]?.body) throw new Error("missing fetch body");
  return JSON.parse(String(call[1].body));
};

describe("NVIDIA provider", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.NVIDIA_API_KEY = "nvidia-key";
    delete process.env.NVIDIA_MODEL;
    delete process.env.NVIDIA_REQUEST_TIMEOUT_MS;
    delete process.env.NVIDIA_MAX_TOKENS;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("maps the selected effort to NVIDIA MiniMax M3 thinking_mode", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              content: '{"answer":"ok"}',
              reasoning_content: "provider trace"
            }
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callNvidiaJSON("hola", schema, {
      model: "minimaxai/minimax-m3",
      reasoningLevel: "alto"
    });

    expect(result).toEqual({
      ok: true,
      data: { answer: "ok" },
      raw: '{"answer":"ok"}',
      model: "minimaxai/minimax-m3",
      reasoning: "provider trace",
      reasoningMode: "thinking_mode"
    });
    expect(getRequestBody(fetchMock)).toMatchObject({
      model: "minimaxai/minimax-m3",
      temperature: 1,
      chat_template_kwargs: { thinking_mode: "enabled" }
    });
  });

  it("maps GLM 5.2 levels to its real thinking controls", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: '{"answer":"ok"}' } }]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callNvidiaJSON("hola", schema, {
      model: "z-ai/glm-5.2",
      reasoningLevel: "alto"
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reasoning).toBeNull();
      expect(result.reasoningMode).toBe("effort");
    }
    expect(getRequestBody(fetchMock)).toMatchObject({
      reasoning_effort: "max",
      chat_template_kwargs: { enable_thinking: true, clear_thinking: false }
    });
  });

  it("disables GLM 5.2 thinking in instant mode", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ choices: [{ message: { content: '{"answer":"ok"}' } }] })
    );
    vi.stubGlobal("fetch", fetchMock);

    await callNvidiaJSON("hola", schema, {
      model: "z-ai/glm-5.2",
      reasoningLevel: "bajo"
    });

    expect(getRequestBody(fetchMock)).toMatchObject({
      chat_template_kwargs: { enable_thinking: false, clear_thinking: false }
    });
    expect(getRequestBody(fetchMock)).not.toHaveProperty("reasoning_effort");
  });

  it("streams provider reasoning and structured content separately", async () => {
    const sse = [
      'data: {"choices":[{"delta":{"reasoning_content":"revisión "}}]}',
      'data: {"choices":[{"delta":{"content":"{\\"answer\\":\\""}}]}',
      'data: {"choices":[{"delta":{"content":"ok\\"}"}}]}',
      "data: [DONE]",
      ""
    ].join("\n");
    const fetchMock = vi.fn(async () => new Response(sse, {
      headers: { "Content-Type": "text/event-stream" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    const content: string[] = [];
    const reasoning: string[] = [];

    const result = await callNvidiaJSONStream("hola", schema, {
      model: "minimaxai/minimax-m3",
      reasoningLevel: "medio",
      callbacks: {
        onContentDelta: (delta) => { content.push(delta); },
        onReasoningDelta: (delta) => { reasoning.push(delta); }
      }
    });

    expect(result.ok).toBe(true);
    expect(content.join("")).toBe('{"answer":"ok"}');
    expect(reasoning.join("")).toBe("revisión ");
    expect(getRequestBody(fetchMock)).toMatchObject({
      stream: true,
      chat_template_kwargs: { thinking_mode: "adaptive" }
    });
  });
});
