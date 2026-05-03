import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AI provider source configuration", () => {
  const providerSource = fs.readFileSync(
    path.join(process.cwd(), "lib/ai/provider.ts"),
    "utf8"
  );
  const chatRouteSource = fs.readFileSync(
    path.join(process.cwd(), "app/api/chat/route.ts"),
    "utf8"
  );
  const envExampleSource = fs.readFileSync(
    path.join(process.cwd(), ".env.example"),
    "utf8"
  );
  const chatTypesSource = fs.readFileSync(
    path.join(process.cwd(), "lib/chat/types.ts"),
    "utf8"
  );

  it("uses OpenRouter in provider auto-order without Cerebras", () => {
    expect(providerSource).toContain("openrouter");
    expect(providerSource).toContain("OPENROUTER_API_KEY");
    expect(providerSource).not.toContain("cerebras");
    expect(providerSource).not.toContain("CEREBRAS");
  });

  it("accepts OpenRouter in the chat route and removes Cerebras instructions", () => {
    expect(chatRouteSource).toContain('"openrouter"');
    expect(chatRouteSource).toContain("OPENROUTER_API_KEY");
    expect(chatRouteSource).not.toContain('z.enum(["auto", "cerebras"');
    expect(chatRouteSource).not.toContain("CEREBRAS_API_KEY");
  });

  it("documents OpenRouter env vars instead of Cerebras", () => {
    expect(envExampleSource).toContain("OPENROUTER_API_KEY=");
    expect(envExampleSource).toContain("OPENROUTER_MODEL=openai/gpt-oss-120b:free");
    expect(envExampleSource).not.toContain("CEREBRAS_");
  });

  it("exposes OpenRouter in chat types without naming Cerebras", () => {
    expect(chatTypesSource).toContain('"openrouter"');
    expect(chatTypesSource).not.toContain("cerebras");
  });
});
