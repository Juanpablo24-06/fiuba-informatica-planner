export type { AdminActionResult } from "@/modules/chat/application/admin-actions";
import { adminActionService } from "@/modules/chat/server";
export const { executeAdminActions } = adminActionService;
