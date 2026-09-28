export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/core${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.error?.message ?? "Request failed",
      response.status,
      data.error?.code ?? "UNKNOWN",
    );
  return data as T;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  enabled: boolean;
  groupIds: string[];
  version: number;
}
export interface Group {
  id: string;
  name: string;
  description: string;
  version: number;
}
export interface Model {
  id: string;
  name: string;
  provider: "fake" | "openai-compatible" | "anthropic" | "gemini";
  model: string;
  baseUrl: string;
  timeoutSeconds: number;
  maxOutputTokens: number;
  testedVersion: number | null;
  toolsTestedVersion: number | null;
  toolsSupported: boolean | null;
  enabled: boolean;
  isDefault: boolean;
  version: number;
  hasApiKey: boolean;
}
