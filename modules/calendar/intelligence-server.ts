import "server-only";
import { createCalendarIntelligenceService } from "./application/intelligence";
import { calendarIntelligenceRepository } from "./adapters/supabase-intelligence";
import { callAIJSON } from "@/modules/chat/adapters/provider";
export const calendarIntelligenceService = createCalendarIntelligenceService(calendarIntelligenceRepository, { callAIJSON }, () => process.env.OPENROUTER_MODEL ?? process.env.NVIDIA_MODEL ?? "unknown");
