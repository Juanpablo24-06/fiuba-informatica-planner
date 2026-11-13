import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AI provider source configuration", () => {
  const providerSource = fs.readFileSync(
    path.join(process.cwd(), "modules/chat/adapters/provider.ts"),
    "utf8"
  );
  const chatRouteSource = fs.readFileSync(path.join(process.cwd(), "modules/chat/domain/request.ts"), "utf8") + fs.readFileSync(
    path.join(process.cwd(), "modules/chat/adapters/http.ts"),
    "utf8"
  );
  const envExampleSource = fs.readFileSync(
    path.join(process.cwd(), ".env.example"),
    "utf8"
  );
  const chatTypesSource = fs.readFileSync(
    path.join(process.cwd(), "modules/chat/domain/types.ts"),
    "utf8"
  );

  it("uses OpenRouter in provider auto-order without Cerebras", () => {
    expect(providerSource).toContain("openrouter");
    expect(providerSource).toContain("OPENROUTER_API_KEY");
    expect(providerSource).not.toContain("cerebras");
    expect(providerSource).not.toContain("CEREBRAS");
    expect(providerSource).not.toContain("gemini");
    expect(providerSource).toContain("z-ai/glm-5.2");
  });

  it("accepts OpenRouter in the chat executor and removes Cerebras instructions", () => {
    expect(chatRouteSource).toContain('"openrouter"');
    expect(chatRouteSource).toContain("OPENROUTER_API_KEY");
    expect(chatRouteSource).not.toContain('z.enum(["auto", "cerebras"');
    expect(chatRouteSource).not.toContain("CEREBRAS_API_KEY");
    expect(chatRouteSource).not.toContain("GEMINI_API_KEY");
  });

  it("documents OpenRouter env vars instead of Cerebras", () => {
    expect(envExampleSource).toContain("OPENROUTER_API_KEY=");
    expect(envExampleSource).toContain("OPENROUTER_MODEL=openai/gpt-oss-120b:free");
    expect(envExampleSource).not.toContain("CEREBRAS_");
    expect(envExampleSource).not.toContain("GEMINI_");
    expect(envExampleSource).toContain("NVIDIA_MODEL=z-ai/glm-5.2");
  });

  it("exposes OpenRouter in chat types without naming Cerebras", () => {
    expect(chatTypesSource).toContain('"openrouter"');
    expect(chatTypesSource).not.toContain("cerebras");
    expect(chatTypesSource).not.toContain("gemini");
  });
});
