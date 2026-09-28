export class CoreError extends Error {
  constructor(
    public code: string,
    public status: number,
    message = code,
  ) {
    super(message);
  }
}
export function required<T>(value: T | null | undefined): T {
  if (value == null) throw new CoreError("NOT_FOUND", 404);
  return value;
}
