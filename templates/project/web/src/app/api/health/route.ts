import { coreConfig } from "../../../server/core";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await coreConfig.store.health();
    return Response.json({ status: "ok", database: "ready" });
  } catch {
    return Response.json(
      { status: "unavailable", database: "unavailable" },
      { status: 503 },
    );
  }
}
