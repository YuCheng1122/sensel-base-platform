/** Server-only configuration. Never serialize API keys to a browser or trace. */
export interface MailRuntimeConfig {
  version: number;
  enabled: boolean;
  provider: "resend" | "fake";
  from: string;
  apiKey?: string;
}
export interface MailMessage {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  expectedVersion: number;
  /** Stable, server-scoped key for the same logical message; never regenerate on timeout. */
  idempotencyKey: string;
}
export type MailState = "accepted" | "rejected" | "unknown" | "cancelled";
export interface MailResult {
  state: MailState;
  providerMessageId?: string;
  errorCode?: string;
  synthetic?: boolean;
}
export interface MailTransport {
  send(
    config: MailRuntimeConfig,
    message: MailMessage,
    signal?: AbortSignal,
  ): Promise<MailResult>;
}
export interface MailSettings {
  provider: "resend" | "fake";
  enabled: boolean;
  fromName: string;
  fromEmail: string;
  version: number;
  hasApiKey: boolean;
  allowedProviders: ("resend" | "fake")[];
}
export interface MailDelivery {
  id: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  actorId: string;
  to: string[];
  subject: string;
  configVersion: number;
  state: MailState;
  providerMessageId: string | null;
  errorCode: string | null;
  synthetic: boolean;
}
