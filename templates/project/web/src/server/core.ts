import { createSyntheticAnalysisProvider } from "./synthetic-analysis-provider";
import { PrismaClient } from "@prisma/client";
import { createCoreHandler, type CoreConfig } from "@sensel/server";
import { createPrismaStore } from "./prisma-store";
const globalDb = globalThis as unknown as { senselDb?: PrismaClient };
const db = globalDb.senselDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.senselDb = db;
export const coreConfig: CoreConfig = {
  store: createPrismaStore(db),
  analysisProvider: createSyntheticAnalysisProvider(),
  publicOrigin: process.env.PUBLIC_APP_URL,
  encryptionKey: process.env.SETTINGS_ENCRYPTION_KEY ?? "",
  agentUrl: process.env.AGENT_URL ?? "http://127.0.0.1:8000",
  agentSecret: process.env.AGENT_SHARED_SECRET ?? "",
  secureCookies: process.env.SECURE_COOKIES !== "false",
  allowedModelEndpoints: (process.env.MODEL_ALLOWED_ENDPOINTS ?? "")
    .split(",")
    .map((v) => v.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  allowFake:
    process.env.AGENT_ALLOW_FAKE === "true" &&
    ["development", "test"].includes(process.env.APP_ENV ?? ""),
  tools: ["project_info"],
};
export const handleCore = createCoreHandler(coreConfig);
