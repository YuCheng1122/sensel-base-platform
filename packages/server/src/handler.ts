import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { z, ZodError } from "zod";
import type { CoreConfig, User, Model } from "./types";
import { CoreError, required } from "./errors";
import { tokenHash, encryptSecret } from "./secrets";
import {
  loginInput,
  userInput,
  groupInput,
  modelInput,
  profileInput,
} from "./validation";
import { agentFetch, profile, streamChat, cancelRun } from "./agent-bridge";
const { compare, hash } = bcrypt;
const publicUser = (user: User) => {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
};
const publicModel = (model: Model) => {
  const { encryptedApiKey, ...safe } = model;
  return { ...safe, hasApiKey: !!encryptedApiKey };
};
const sessionToken = (request: Request) =>
  request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("sensel_session="))
    ?.slice(15) ?? "";
const loginAttempts = new Map<string, { count: number; until: number }>();
function throttle(email: string) {
  const now = Date.now();
  for (const [key, value] of loginAttempts)
    if (value.until < now) loginAttempts.delete(key);
  const entry = loginAttempts.get(email) ?? {
    count: 0,
    until: now + 15 * 60 * 1000,
  };
  if (entry.count >= 10) throw new CoreError("TOO_MANY_ATTEMPTS", 429);
  entry.count++;
  loginAttempts.set(email, entry);
}
function admin(user: User) {
  if (user.role !== "ADMIN") throw new CoreError("FORBIDDEN", 403);
}
function trustedOrigin(
  configured: string | undefined,
  requestUrl: URL,
): string {
  if (!configured) return requestUrl.origin;
  try {
    const url = new URL(configured);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error("Invalid origin");
    return url.origin;
  } catch {
    throw new CoreError(
      "CONFIGURATION_ERROR",
      503,
      "PUBLIC_APP_URL must be an HTTP(S) origin without a path",
    );
  }
}
export function createCoreHandler(config: CoreConfig) {
  return async (request: Request): Promise<Response> => {
    try {
      if (
        Buffer.from(config.encryptionKey, "base64").length !== 32 ||
        config.agentSecret.length < 32
      )
        throw new CoreError(
          "CONFIGURATION_ERROR",
          503,
          "Configure SETTINGS_ENCRYPTION_KEY and AGENT_SHARED_SECRET",
        );
      return await handle(config, request);
    } catch (error) {
      if (error instanceof CoreError)
        return Response.json(
          { error: { code: error.code, message: error.message } },
          { status: error.status },
        );
      if (error instanceof ZodError || error instanceof SyntaxError)
        return Response.json(
          {
            error: { code: "INVALID_INPUT", message: "Invalid request fields" },
          },
          { status: 400 },
        );
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      )
        return Response.json(
          {
            error: { code: "ALREADY_EXISTS", message: "Record already exists" },
          },
          { status: 409 },
        );
      return Response.json(
        { error: { code: "INTERNAL_ERROR", message: "Request failed" } },
        { status: 500 },
      );
    }
  };
}
async function handle(config: CoreConfig, request: Request): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname.replace(/^\/api\/core\//, "").split("/"),
    method = request.method;
  const write = !["GET", "HEAD"].includes(method);
  if (write) {
    const origin = request.headers.get("origin");
    if (origin && origin !== trustedOrigin(config.publicOrigin, url))
      throw new CoreError("INVALID_ORIGIN", 403);
    if (request.headers.get("sec-fetch-site") === "cross-site")
      throw new CoreError("INVALID_ORIGIN", 403);
    if (Number(request.headers.get("content-length") ?? 0) > 65536)
      throw new CoreError("PAYLOAD_TOO_LARGE", 413);
  }
  const cookie = (token: string, age: number) =>
    `sensel_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${config.secureCookies ? "; Secure" : ""}`;
  if (path.join("/") === "auth/login" && method === "POST") {
    const input = loginInput.parse(await request.json());
    throttle(input.email);
    const user = await config.store.userByEmail(input.email);
    if (!user?.enabled || !(await compare(input.password, user.passwordHash)))
      throw new CoreError("INVALID_CREDENTIALS", 401);
    loginAttempts.delete(input.email);
    const token = randomBytes(32).toString("base64url");
    await config.store.createSession(
      tokenHash(token),
      user.id,
      new Date(Date.now() + 8 * 3600000),
    );
    return Response.json(
      { user: publicUser(user) },
      { headers: { "set-cookie": cookie(token, 28800) } },
    );
  }
  const token = sessionToken(request);
  const session = token ? await config.store.session(tokenHash(token)) : null;
  if (
    !session ||
    !session.user.enabled ||
    session.expiresAt.getTime() <= Date.now()
  )
    throw new CoreError("UNAUTHORIZED", 401);
  const user = session.user;
  if (path.join("/") === "auth/logout" && method === "POST") {
    await config.store.deleteSession(tokenHash(token));
    return Response.json(
      { ok: true },
      { headers: { "set-cookie": cookie("", 0) } },
    );
  }
  if (path.join("/") === "auth/me") {
    if (method === "GET") return Response.json({ user: publicUser(user) });
    if (method === "PATCH") {
      const input = profileInput.parse(await request.json());
      if (
        input.newPassword &&
        (!input.currentPassword ||
          !(await compare(input.currentPassword, user.passwordHash)))
      )
        throw new CoreError("INVALID_PASSWORD", 400);
      const updated = await config.store.updateProfile(
        user.id,
        input.name,
        input.newPassword ? await hash(input.newPassword, 12) : undefined,
      );
      return Response.json({ user: publicUser(updated) });
    }
  }
  if (path[0] === "users") {
    admin(user);
    if (method === "GET")
      return Response.json({
        items: (await config.store.users()).map(publicUser),
      });
    if (method === "POST" || method === "PATCH") {
      const input = userInput.parse(await request.json());
      if (method === "PATCH" && !input.id)
        throw new CoreError("ID_REQUIRED", 400);
      if (method === "POST" && input.id)
        throw new CoreError("INVALID_INPUT", 400);
      if (!input.id && !input.password)
        throw new CoreError("PASSWORD_REQUIRED", 400);
      const { password, ...data } = input;
      return Response.json({
        item: publicUser(
          await config.store.saveUser(user.id, {
            ...data,
            ...(password ? { passwordHash: await hash(password, 12) } : {}),
          }),
        ),
      });
    }
  }
  if (path[0] === "groups") {
    admin(user);
    if (method === "GET")
      return Response.json({ items: await config.store.groups() });
    if (method === "POST" || method === "PATCH") {
      const input = groupInput.parse(await request.json());
      if ((method === "PATCH") !== !!input.id)
        throw new CoreError("INVALID_INPUT", 400);
      return Response.json({
        item: await config.store.saveGroup(user.id, input),
      });
    }
  }
  if (path[0] === "models") {
    if (method === "GET")
      return Response.json({
        items: (await config.store.models())
          .filter((m) => user.role === "ADMIN" || m.enabled)
          .map(publicModel),
      });
    admin(user);
    if (path[2] === "test" && method === "POST") {
      const model = required(
        (await config.store.models()).find((m) => m.id === path[1]),
      );
      const body = await request.text();
      const { mode } = z
        .object({ mode: z.enum(["connection", "tools"]).default("connection") })
        .parse(body ? JSON.parse(body) : {});
      if (model.provider === "fake" && !config.allowFake)
        throw new CoreError("FAKE_DISABLED", 400);
      const executionId = randomUUID();
      let responseOk = false;
      let result: { status?: string; toolSupported?: boolean } = {};
      try {
        const response = await agentFetch(config, "/v1/models/test", {
          executionId,
          profileToken: profile(config, user, model, executionId),
          mode,
        });
        result = (await response.json()) as typeof result;
        responseOk = response.ok;
      } catch {
        /* Network/provider errors invalidate the previous test stamp. */
      }
      const ok =
        responseOk &&
        result.status === "completed" &&
        (mode !== "tools" || result.toolSupported === true);
      await config.store.recordModelTest(model.id, model.version, { mode, ok });
      return Response.json({
        item: {
          ok,
          mode,
          message: ok ? "Model check passed" : "Model check failed",
          supportsTools: result.toolSupported ?? null,
        },
      });
    }
    if (method === "POST" || method === "PATCH") {
      const input = modelInput.parse(await request.json());
      if ((method === "PATCH") !== !!input.id)
        throw new CoreError("INVALID_INPUT", 400);
      if (input.provider === "fake" && !config.allowFake)
        throw new CoreError("FAKE_DISABLED", 400);
      if (input.baseUrl) {
        const url = new URL(input.baseUrl);
        if (
          !["https:", "http:"].includes(url.protocol) ||
          url.username ||
          url.password ||
          url.search ||
          url.hash
        )
          throw new CoreError("INVALID_ENDPOINT", 400);
        input.baseUrl = url.toString().replace(/\/+$/, "");
        if (!config.allowedModelEndpoints.includes(input.baseUrl))
          throw new CoreError("ENDPOINT_NOT_ALLOWED", 400);
      }
      if (input.provider === "openai-compatible" && !input.baseUrl)
        throw new CoreError("ENDPOINT_REQUIRED", 400);
      const { apiKey, ...data } = input;
      return Response.json({
        item: publicModel(
          await config.store.saveModel(user.id, {
            ...data,
            ...(apiKey
              ? { encryptedApiKey: encryptSecret(apiKey, config.encryptionKey) }
              : {}),
          }),
        ),
      });
    }
  }
  if (path[0] === "chats") {
    if (path.length === 1) {
      if (method === "GET")
        return Response.json({ items: await config.store.chats(user.id) });
      if (method === "POST") {
        const { title } = z
          .object({
            title: z
              .string()
              .trim()
              .min(1)
              .max(200)
              .default("New conversation"),
          })
          .parse(await request.json());
        return Response.json({
          item: await config.store.createChat(user.id, title),
        });
      }
    }
    const id = path[1]!;
    required(await config.store.chat(user.id, id));
    if (path[2] === "messages" && method === "POST")
      return streamChat(config, user, id, request);
    if (path[2] === "cancel" && method === "POST")
      return cancelRun(config, user, id, request);
    if (method === "GET")
      return Response.json({ item: await config.store.chat(user.id, id) });
    if (method === "DELETE") {
      await config.store.deleteChat(user.id, id);
      return Response.json({ ok: true });
    }
  }
  throw new CoreError("NOT_FOUND", 404);
}
