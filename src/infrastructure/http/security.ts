import "server-only";
import { ZodError } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { requestLimits } from "./schema";
import { AppError } from "@/infrastructure/errors";
import { env } from "@/infrastructure/env";
export function assertOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(env().APP_URL).origin)
    throw new AppError("FORBIDDEN", 403);
}
export async function rateLimit(key: string, limit: number, seconds = 60) {
  const hash = createHash("sha256").update(key).digest("hex");
  const [row] = await db
    .insert(requestLimits)
    .values({
      key: hash,
      count: 1,
      expiresAt: new Date(Date.now() + seconds * 1000),
    })
    .onConflictDoUpdate({
      target: requestLimits.key,
      set: {
        count: sql`case when ${requestLimits.expiresAt}<now() then 1 else ${requestLimits.count}+1 end`,
        expiresAt: sql`case when ${requestLimits.expiresAt}<now() then now()+${seconds}*interval '1 second' else ${requestLimits.expiresAt} end`,
      },
    })
    .returning();
  if (row.count > limit) throw new AppError("RATE_LIMITED", 429);
}
export async function limitedBody(request: Request, maxBytes: number) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes)
    throw new AppError("INVALID_INPUT", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("INVALID_INPUT");
  const parts: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maxBytes) {
      await reader.cancel();
      throw new AppError("INVALID_INPUT", 413);
    }
    parts.push(value);
  }
  return Buffer.concat(parts);
}
export async function jsonBody(
  request: Request,
  maxBytes = 64000,
): Promise<unknown> {
  const bytes = await limitedBody(request, maxBytes);
  try {
    return JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw new AppError("INVALID_INPUT");
  }
}
export function httpFailure(error: unknown) {
  if (error instanceof ZodError)
    return Response.json(
      { error: "INVALID_INPUT" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  if (error instanceof AppError)
    return Response.json(
      { error: error.code },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  const requestId = randomUUID();
  console.error("HTTP operation failed", {
    requestId,
    kind: error instanceof Error ? error.name : "unknown",
  });
  return Response.json(
    { error: "INTERNAL", requestId },
    {
      status: 500,
      headers: { "Cache-Control": "no-store", "X-Request-ID": requestId },
    },
  );
}
