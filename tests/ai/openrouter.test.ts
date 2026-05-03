import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { callOpenRouterJSON } from "@/lib/ai/openrouter";

const schema = z.object({
  answer: z.string(),
  reasoning: z.string().nullable().optional()
});

const ORIGINAL_ENV = process.env;

const getRequestBody = (fetchMock: ReturnType<typeof vi.fn>) => {
  const call = fetchMock.mock.calls[0] as [string, RequestInit] | undefined;
  if (!call?.[1]?.body) throw new Error("missing fetch body");
  return JSON.parse(String(call[1].body));
};

describe("OpenRouter provider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-02T12:00:00Z"));
    process.env = { ...ORIGINAL_ENV };
    process.env.OPENROUTER_API_KEY = "openrouter-key";
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_REQUEST_TIMEOUT_MS;
    delete process.env.OPENROUTER_MAX_TOKENS;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses the OpenAI-compatible chat endpoint and validates extracted JSON", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              content: '```json\n{"response":{"answer":"ok","reasoning":"validado"}}\n```'
            }
          }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callOpenRouterJSON("hola", schema, { reasoningLevel: "alto" });

    expect(result).toEqual({
      ok: true,
      data: { answer: "ok", reasoning: "validado" },
      raw: '```json\n{"response":{"answer":"ok","reasoning":"validado"}}\n```',
      model: "openai/gpt-oss-120b:free"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer openrouter-key"
        },
        body: expect.any(String),
        signal: expect.any(AbortSignal)
      })
    );
    expect(getRequestBody(fetchMock)).toEqual({
      model: "openai/gpt-oss-120b:free",
      messages: [{ role: "user", content: "hola" }],
      temperature: 0.2,
      max_tokens: 1800,
      response_format: { type: "json_object" },
      reasoning: { effort: "high" }
    });
  });

  it("does not send reasoning for models without OpenRouter gpt-oss support", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: '{"answer":"ok","reasoning":null}' } }]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await callOpenRouterJSON("hola", schema, {
      model: "google/gemini-2.5-flash",
      reasoningLevel: "medio"
    });

    const body = getRequestBody(fetchMock);
    expect(body.model).toBe("google/gemini-2.5-flash");
    expect(body).not.toHaveProperty("reasoning");
  });

  it("uses optional timeout and max token environment overrides", async () => {
    process.env.OPENROUTER_REQUEST_TIMEOUT_MS = "45000";
    process.env.OPENROUTER_MAX_TOKENS = "900";
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: '{"answer":"ok"}' } }]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await callOpenRouterJSON("hola", schema);

    expect(getRequestBody(fetchMock).max_tokens).toBe(900);
  });
});
