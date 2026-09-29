import { authorizeTool, CoreError } from "@sensel/server";
import { coreConfig } from "../../../../../server/core";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const { user } = await authorizeTool(coreConfig, request, "project_info");
    const chats = await coreConfig.store.chats(user.id);
    return Response.json({
      project: "Sensel Base",
      storage: "PostgreSQL via Prisma",
      recentConversationCount: chats.length,
      historyLimit: 100,
      capabilities: ["chat", "model-settings", "customer-tools"],
    });
  } catch (error) {
    return Response.json(
      {
        error: {
          code: error instanceof CoreError ? error.code : "INVALID_REQUEST",
        },
      },
      { status: error instanceof CoreError ? error.status : 400 },
    );
  }
}
