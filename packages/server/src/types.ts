import type { MailTransport } from "@sensel/mail/contracts";
import type { MailStore } from "./mail-types";
import type { AnalysisProvider, FeatureStore } from "./feature-types";
export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "ADMIN" | "USER";
  enabled: boolean;
  version: number;
  groupIds: string[];
};
export type Group = {
  id: string;
  name: string;
  description: string;
  version: number;
};
export type Model = {
  id: string;
  name: string;
  provider: "fake" | "openai-compatible" | "anthropic" | "gemini";
  model: string;
  baseUrl: string;
  encryptedApiKey: string | null;
  timeoutSeconds: number;
  maxOutputTokens: number;
  testedVersion: number | null;
  toolsTestedVersion: number | null;
  toolsSupported: boolean | null;
  enabled: boolean;
  isDefault: boolean;
  version: number;
};
export type Message = {
  id: string;
  role: string;
  content: string;
  status: string;
  executionId: string | null;
  createdAt: Date;
  trace: unknown;
};
export type Chat = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  messages?: Message[];
};
export interface CoreStore extends FeatureStore, MailStore {
  userByEmail(email: string): Promise<User | null>;
  userById(id: string): Promise<User | null>;
  session(tokenHash: string): Promise<{ user: User; expiresAt: Date } | null>;
  createSession(
    tokenHash: string,
    userId: string,
    expiresAt: Date,
  ): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  users(): Promise<User[]>;
  groups(): Promise<Group[]>;
  models(): Promise<Model[]>;
  saveUser(
    actorId: string,
    data: Partial<User> & { expectedVersion?: number },
  ): Promise<User>;
  saveGroup(
    actorId: string,
    data: Partial<Group> & { expectedVersion?: number },
  ): Promise<Group>;
  saveModel(
    actorId: string,
    data: Partial<Model> & { expectedVersion?: number },
  ): Promise<Model>;
  updateProfile(
    userId: string,
    name: string,
    passwordHash?: string,
  ): Promise<User>;
  chats(userId: string): Promise<Chat[]>;
  chat(userId: string, id: string): Promise<Chat | null>;
  createChat(userId: string, title: string): Promise<Chat>;
  renameChat(userId: string, id: string, title: string): Promise<Chat>;
  deleteChats(userId: string): Promise<number>;
  deleteChat(userId: string, id: string): Promise<void>;
  addMessage(
    chatId: string,
    role: string,
    content: string,
    status: string,
    executionId?: string,
    trace?: unknown[],
  ): Promise<void>;
  recordModelTest(
    id: string,
    version: number,
    result: { mode: "connection" | "tools"; ok: boolean },
  ): Promise<void>;
  audit(actorId: string, action: string, targetId: string): Promise<void>;
  health(): Promise<void>;
}
export type CoreConfig = {
  explorationProvider?: import("./exploration").ExplorationProvider;
  usageProvider?: import("./model-usage").UsageProvider;
  /** Trusted browser origin when the framework normalizes the internal request URL. */
  publicOrigin?: string;
  analysisProvider?: AnalysisProvider;
  store: CoreStore;
  encryptionKey: string;
  agentUrl: string;
  agentSecret: string;
  secureCookies: boolean;
  allowedModelEndpoints: string[];
  allowFake: boolean;
  allowFakeMail?: boolean;
  mailTransport?: MailTransport;
  tools?: string[];
};
