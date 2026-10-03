import "server-only";
import { and, eq } from "drizzle-orm";
import { db, type Transaction } from "@/infrastructure/db";
import { memberships, memberBranches, auditLogs } from "./schema";
import { restaurants } from "@/modules/restaurants/schema";
import { getSession } from "@/modules/auth/server";
import { rateLimit } from "@/infrastructure/http/security";
import { AppError } from "@/infrastructure/errors";
import { can, hasBranch, type Permission } from "./policy";
import { z } from "zod";

type Reader = typeof db | Transaction;
export async function resolveActor(
  database: Reader,
  userId: string,
  restaurantId: string,
  permission: Permission,
) {
  const id = z.uuid().parse(restaurantId);
  const [row] = await database
    .select({ membership: memberships, restaurant: restaurants })
    .from(memberships)
    .innerJoin(restaurants, eq(restaurants.id, memberships.restaurantId))
    .where(
      and(
        eq(memberships.restaurantId, id),
        eq(memberships.userId, userId),
        eq(memberships.active, true),
      ),
    )
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", 404);
  if (!can(row.membership.role, permission))
    throw new AppError("FORBIDDEN", 403);
  if (row.restaurant.status === "ARCHIVED")
    throw new AppError("NOT_FOUND", 404);
  if (
    row.restaurant.status === "SUSPENDED" &&
    ![
      "restaurant:read",
      "billing:manage",
      "order:read",
      "order:transition",
    ].includes(permission)
  )
    throw new AppError("SUSPENDED", 403);
  const assigned = await database
    .select({ id: memberBranches.branchId })
    .from(memberBranches)
    .where(
      and(
        eq(memberBranches.restaurantId, id),
        eq(memberBranches.membershipId, row.membership.id),
      ),
    );
  return {
    ...row,
    userId,
    restaurantId: id,
    allBranches: row.membership.allBranches,
    branchIds: assigned.map((b) => b.id),
  };
}
export type Actor = Awaited<ReturnType<typeof resolveActor>>;
export async function requireActor(
  restaurantId: string,
  permission: Permission,
) {
  const session = await getSession();
  if (!session?.user.emailVerified) throw new AppError("UNAUTHENTICATED", 401);
  return resolveActor(db, session.user.id, restaurantId, permission);
}
export function requireBranch(actor: Actor, branchId: string) {
  if (!hasBranch(actor, branchId)) throw new AppError("NOT_FOUND", 404);
}
export async function withTenant<T>(
  restaurantId: string,
  permission: Permission,
  run: (tx: Transaction, actor: Actor) => Promise<T>,
) {
  const session = await getSession();
  if (!session?.user.emailVerified) throw new AppError("UNAUTHENTICATED", 401);
  const id = z.uuid().parse(restaurantId);
  await rateLimit(`tenant-write:${session.user.id}`, 120);
  return db.transaction(async (tx) => {
    // A single tenant lock serializes membership revocation and tenant mutations.
    // Membership is checked before and after the lock to prevent cross-tenant locking abuse.
    await resolveActor(tx, session.user.id, id, permission);
    await tx
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.id, id))
      .for("update");
    const actor = await resolveActor(tx, session.user.id, id, permission);
    return run(tx, actor);
  });
}
export async function audit(
  tx: Transaction,
  actor: Actor,
  action: string,
  resourceId?: string,
  reason?: string,
) {
  await tx.insert(auditLogs).values({
    restaurantId: actor.restaurantId,
    actorId: actor.userId,
    scope: "restaurant",
    action,
    resourceId,
    reason,
  });
}
