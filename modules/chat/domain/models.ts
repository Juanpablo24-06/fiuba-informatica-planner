import type { AIProvider, ReasoningLevel } from "@/modules/chat/domain/types";

export type ControlledReasoningMode = "effort" | "thinking_mode" | "native";

export type ChatModelDefinition = {
  id: string;
  provider: Exclude<AIProvider, "auto">;
  providerLabel: string;
  value: string;
  label: string;
  reasoningMode: ControlledReasoningMode;
  reasoningLevels: ReasoningLevel[];
  reasoningNote: string;
  supportsImages: boolean;
};

/**
 * Keep this registry aligned with the provider IDs exposed by NVIDIA NIM.
 * A model only gets a level selector when the API has a real control for it.
 */
export const CHAT_MODEL_OPTIONS: ChatModelDefinition[] = [
  {
    id: "openrouter-gpt-oss-120b-free",
    provider: "openrouter",
    providerLabel: "OpenRouter",
    value: "openai/gpt-oss-120b:free",
    label: "GPT-OSS 120B Free",
    reasoningMode: "effort",
    reasoningLevels: ["bajo", "medio", "alto"],
    reasoningNote: "Esfuerzo real del proveedor",
    supportsImages: false
  },
  {
    id: "nvidia-glm-5-2",
    provider: "nvidia",
    providerLabel: "NVIDIA",
    value: "z-ai/glm-5.2",
    label: "GLM 5.2",
    reasoningMode: "effort",
    reasoningLevels: ["bajo", "medio", "alto"],
    reasoningNote: "Thinking real: off, high o max",
    supportsImages: false
  },
  {
    id: "nvidia-minimax-m-3",
    provider: "nvidia",
    providerLabel: "NVIDIA",
    value: "minimaxai/minimax-m3",
    label: "MiniMax M3",
    reasoningMode: "thinking_mode",
    reasoningLevels: ["bajo", "medio", "alto"],
    reasoningNote: "Modo de pensamiento real",
    supportsImages: true
  },
  {
    id: "nvidia-minimax-m-2-7",
    provider: "nvidia",
    providerLabel: "NVIDIA",
    value: "minimaxai/minimax-m2.7",
    label: "MiniMax M2.7",
    reasoningMode: "native",
    reasoningLevels: [],
    reasoningNote: "Razonamiento nativo automático",
    supportsImages: false
  }
];

export const DEFAULT_CHAT_MODEL =
  CHAT_MODEL_OPTIONS.find((option) => option.id === "nvidia-glm-5-2") ??
  CHAT_MODEL_OPTIONS[0];

export const reasoningLabelByLevel: Record<ReasoningLevel, string> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto"
};

export const reasoningLabelForModel = (
  reasoningMode: ControlledReasoningMode,
  level: ReasoningLevel,
  modelValue?: string
) => {
  if (modelValue === "z-ai/glm-5.2") {
    return { bajo: "Instantáneo", medio: "Thinking", alto: "Thinking Max" }[level];
  }
  if (reasoningMode !== "thinking_mode") return reasoningLabelByLevel[level];
  return {
    bajo: "Instantáneo",
    medio: "Adaptativo",
    alto: "Thinking"
  }[level];
};

export const VISION_CHAT_MODEL =
  CHAT_MODEL_OPTIONS.find((option) => option.supportsImages) ?? DEFAULT_CHAT_MODEL;
