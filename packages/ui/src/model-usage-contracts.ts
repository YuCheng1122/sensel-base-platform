/** Provider-defined allowance, not inferred run token consumption. */
export interface ModelUsage {
  status: "available" | "unsupported";
  provider: string;
  scope: "key" | "account" | "model" | "run";
  unit: string;
  used: number | null;
  remaining: number | null;
  limit: number | null;
  unlimited: boolean;
  expiresAt: string | null;
  checkedAt: string;
  period?: string;
}
