import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db, type Transaction } from "@/infrastructure/db";
import { getSession } from "@/modules/auth/server";
import { session, user } from "@/modules/auth/schema";
import { platformGrants } from "./schema";
import { auditLogs } from "@/modules/memberships/schema";
import { rateLimit } from "@/infrastructure/http/security";
import { AppError } from "@/infrastructure/errors";
export async function resolvePlatform(
  reader: typeof db | Transaction,
  sessionId: string,
  userId: string,
) {
  const [row] = await reader
    .select({ grant: platformGrants, account: user, session })
    .from(platformGrants)
    .innerJoin(user, eq(user.id, platformGrants.userId))
    .innerJoin(
      session,
      and(eq(session.userId, user.id), eq(session.id, sessionId)),
    )
    .where(
      and(
        eq(user.id, userId),
        eq(platformGrants.active, true),
        eq(user.emailVerified, true),
        eq(user.twoFactorEnabled, true),
        gt(session.expiresAt, new Date()),
      ),
    );
  if (!row) throw new AppError("FORBIDDEN", 403);
  // A pre-MFA or pre-grant session cannot become privileged retroactively.
  if (
    row.session.createdAt < row.account.updatedAt ||
    row.session.createdAt < row.grant.createdAt ||
    Date.now() - row.session.createdAt.getTime() > 15 * 60_000
  )
    throw new AppError("UNAUTHENTICATED", 401);
  return { userId, sessionId };
}
export async function requirePlatform() {
  const s = await getSession();
  if (!s?.user.emailVerified) throw new AppError("UNAUTHENTICATED", 401);
  return resolvePlatform(db, s.session.id, s.user.id);
}
export async function withPlatform<T>(
  run: (
    tx: Transaction,
    actor: { userId: string; sessionId: string },
  ) => Promise<T>,
) {
  const actor = await requirePlatform();
  await rateLimit(`platform-write:${actor.userId}`, 60);
  return db.transaction(async (tx) => {
    await tx
      .select({ id: platformGrants.userId })
      .from(platformGrants)
      .where(eq(platformGrants.userId, actor.userId))
      .for("share");
    await resolvePlatform(tx, actor.sessionId, actor.userId);
    return run(tx, actor);
  });
}
export async function platformAudit(
  tx: Transaction,
  actorId: string,
  action: string,
  resourceId: string,
  reason: string,
  restaurantId?: string,
) {
  await tx.insert(auditLogs).values({
    actorId,
    scope: "platform",
    action,
    resourceId,
    reason,
    restaurantId,
  });
}
