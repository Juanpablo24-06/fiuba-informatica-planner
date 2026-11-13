import type { NextRequest } from "next/server";
import { executeChatRequest } from "@/app/api/chat/execute";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  return executeChatRequest(request);
}
