import "server-only";
import { academicService } from "@/modules/academic/server";
import { plannerEntryService } from "@/modules/planning/server";
import { createAdminActionService } from "./application/admin-actions";
export const adminActionService = createAdminActionService(academicService, plannerEntryService);

import { createChatService } from "./application/chat";
import * as provider from "./adapters/provider";
import * as memory from "./adapters/memory";
import { conversationRepository } from "./adapters/supabase-conversations";
import { createChatContextReader } from "./adapters/academic-context";
export const chatService = createChatService({
  provider, memory,
  conversations: conversationRepository,
  context: createChatContextReader(conversationRepository),
  executeAdminActions: adminActionService.executeAdminActions,
  persistenceEnabled: () => process.env.CHAT_PERSISTENCE_ENABLED !== "false"
});
