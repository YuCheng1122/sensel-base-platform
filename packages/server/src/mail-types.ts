import type {
  MailDelivery,
  MailMessage,
  MailResult,
} from "@sensel/mail/contracts";
export interface StoredMailSettings {
  provider: "resend" | "fake";
  enabled: boolean;
  fromName: string;
  fromEmail: string;
  version: number;
  encryptedApiKey: string | null;
}
export interface MailStore {
  mailSettings(actorId: string): Promise<StoredMailSettings>;
  saveMailSettings(
    actorId: string,
    input: Omit<StoredMailSettings, "version" | "encryptedApiKey"> & {
      expectedVersion: number;
      encryptedApiKey?: string;
    },
  ): Promise<StoredMailSettings>;
  reserveMail(
    actorId: string,
    message: MailMessage,
    fingerprint: string,
  ): Promise<{ delivery: MailDelivery; claimed: boolean; replayed: boolean }>;
  completeMail(id: string, result: MailResult): Promise<MailDelivery>;
  mailDeliveries(
    actorId: string,
    input: { page: number; pageSize: number },
  ): Promise<{
    items: MailDelivery[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
export const defaultMailSettings: StoredMailSettings = {
  provider: "resend",
  enabled: false,
  fromName: "SenseL",
  fromEmail: "",
  version: 1,
  encryptedApiKey: null,
};
