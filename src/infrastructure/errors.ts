import { ZodError } from "zod";
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "CONFLICT"
  | "SUSPENDED"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "PRICE_CHANGED"
  | "PLAN_LIMIT";
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public status = 400,
  ) {
    super(code);
  }
}
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | {
      ok: false;
      error: ErrorCode | "INTERNAL";
      fields?: Record<string, string[]>;
    };
export function failure(error: unknown): ActionResult<never> {
  if (error instanceof AppError) return { ok: false, error: error.code };
  if (error instanceof ZodError)
    return {
      ok: false,
      error: "INVALID_INPUT",
      fields: error.flatten().fieldErrors,
    };
  const cause =
    error && typeof error === "object" && "cause" in error
      ? error.cause
      : error;
  if (
    cause &&
    typeof cause === "object" &&
    "code" in cause &&
    cause.code === "23505"
  )
    return { ok: false, error: "CONFLICT" };
  if (
    cause &&
    typeof cause === "object" &&
    "code" in cause &&
    (cause.code === "23503" || cause.code === "23514")
  )
    return { ok: false, error: "INVALID_INPUT" };
  console.error("Operation failed", {
    kind: error instanceof Error ? error.name : "unknown",
  });
  return { ok: false, error: "INTERNAL" };
}
