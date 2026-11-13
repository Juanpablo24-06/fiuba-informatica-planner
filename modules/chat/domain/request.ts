import { z } from "zod";
import { reasoningLevelSchema } from "./schemas";
export const payloadSchema = z.object({
  message: z.string().trim().min(1),
  threadId: z.string().uuid().optional(),
  storeHistory: z.boolean().optional(),
  allowActions: z.boolean().optional(),
  reasoningLevel: reasoningLevelSchema.optional(),
  provider: z.enum(["auto", "openrouter", "nvidia"]).optional(),
  model: z.string().trim().max(120).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1400)
      })
    )
    .max(14)
    .optional()
});

export type ChatPayload = z.infer<typeof payloadSchema>;
