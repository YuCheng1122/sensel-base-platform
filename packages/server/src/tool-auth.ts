import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { CoreError } from "./errors";
import type { CoreConfig } from "./types";
const claims = z.object({
  v: z.literal(1),
  sub: z.string().uuid(),
  executionId: z.string().uuid(),
  exp: z.number(),
  deadlineMs: z.number().finite().optional(),
  tools: z.array(z.string()),
});
function equal(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export async function authorizeTool(
  config: CoreConfig,
  request: Request,
  toolName: string,
) {
  if (
    !equal(
      request.headers.get("authorization") ?? "",
      `Bearer ${config.agentSecret}`,
    )
  )
    throw new CoreError("UNAUTHORIZED", 401);
  const body = z
    .object({
      executionId: z.string().uuid(),
      profileToken: z.string().max(32000),
      arguments: z.record(z.unknown()).default({}),
    })
    .parse(await request.json());
  const [payload, signature, ...extra] = body.profileToken.split(".");
  if (
    !payload ||
    !signature ||
    extra.length ||
    !equal(
      createHmac("sha256", config.agentSecret)
        .update(payload)
        .digest("base64url"),
      signature,
    )
  )
    throw new CoreError("UNAUTHORIZED", 401);
  const profile = claims.parse(
    JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
  );
  if (
    profile.exp <= Date.now() / 1000 ||
    profile.executionId !== body.executionId ||
    !profile.tools.includes(toolName)
  )
    throw new CoreError("FORBIDDEN", 403);
  if (profile.deadlineMs !== undefined && profile.deadlineMs <= Date.now())
    throw new CoreError("EXECUTION_TIMEOUT", 408);
  const user = await config.store.userById(profile.sub);
  if (!user?.enabled) throw new CoreError("UNAUTHORIZED", 401);
  return { user, arguments: body.arguments, executionId: body.executionId, deadlineMs: profile.deadlineMs };
}
