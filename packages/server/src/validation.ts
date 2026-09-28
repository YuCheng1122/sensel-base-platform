import { z } from "zod";
const identity = {
  id: z.string().uuid().optional(),
  expectedVersion: z.number().int().positive().optional(),
};
export const loginInput = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  password: z.string().max(128),
});
export const userInput = z.object({
  ...identity,
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  name: z.string().trim().min(1).max(100),
  role: z.enum(["ADMIN", "USER"]),
  enabled: z.boolean(),
  password: z.string().min(12).max(72).optional(),
  groupIds: z.array(z.string().uuid()).max(100).default([]),
});
export const groupInput = z.object({
  ...identity,
  name: z.string().trim().min(1).max(100),
  description: z.string().max(1000).default(""),
});
export const modelInput = z.object({
  ...identity,
  name: z.string().trim().min(1).max(100),
  provider: z.enum(["fake", "openai-compatible", "anthropic", "gemini"]),
  model: z.string().trim().min(1).max(200),
  baseUrl: z.string().max(1000).default(""),
  timeoutSeconds: z.number().int().min(5).max(120).default(60),
  maxOutputTokens: z.number().int().min(128).max(16384).default(4096),
  apiKey: z.string().min(1).max(8192).optional(),
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});
export const profileInput = z.object({
  name: z.string().trim().min(1).max(100),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(12).max(72).optional(),
});
