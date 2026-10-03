import "server-only";
import { and, eq, gt, desc, count } from "drizzle-orm";
import { db, type Transaction } from "@/infrastructure/db";
import { requireActor } from "@/modules/memberships/server";
import { memberships } from "@/modules/memberships/schema";
import { products } from "@/modules/products/schema";
import { branches } from "@/modules/branches/schema";
import { AppError } from "@/infrastructure/errors";
import { plans, subscriptions, payments } from "./schema";
import { freeLimits, planLimitsSchema } from "./validation";
export async function entitlement(
  reader: typeof db | Transaction,
  restaurantId: string,
) {
  const [row] = await reader
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(subscriptions.restaurantId, restaurantId),
        eq(subscriptions.status, "ACTIVE"),
        gt(subscriptions.endsAt, new Date()),
      ),
    );
  return {
    limits: row ? planLimitsSchema.parse(row.plan.limits) : freeLimits,
    plan: row?.plan ?? null,
    subscription: row?.subscription ?? null,
  };
}
// Call under the tenant lock: a concurrent create cannot overspend the same quota.
export async function checkQuota(
  tx: Transaction,
  restaurantId: string,
  kind: "branches" | "products" | "members",
) {
  const { limits } = await entitlement(tx, restaurantId);
  let used = 0;
  if (kind === "branches") {
    const [r] = await tx
      .select({ n: count() })
      .from(branches)
      .where(
        and(eq(branches.restaurantId, restaurantId), eq(branches.active, true)),
      );
    used = r.n;
  }
  if (kind === "products") {
    const [r] = await tx
      .select({ n: count() })
      .from(products)
      .where(
        and(
          eq(products.restaurantId, restaurantId),
          eq(products.archived, false),
        ),
      );
    used = r.n;
  }
  if (kind === "members") {
    const [r] = await tx
      .select({ n: count() })
      .from(memberships)
      .where(
        and(
          eq(memberships.restaurantId, restaurantId),
          eq(memberships.active, true),
        ),
      );
    used = r.n;
  }
  if (used >= limits[kind]) throw new AppError("PLAN_LIMIT", 403);
}
export async function billingSummary(restaurantId: string) {
  const actor = await requireActor(restaurantId, "billing:manage");
  return {
    ...(await entitlement(db, actor.restaurantId)),
    payments: await db
      .select({
        id: payments.id,
        amountMinor: payments.amountMinor,
        currency: payments.currency,
        reference: payments.reference,
        voided: payments.voided,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.restaurantId, actor.restaurantId))
      .orderBy(desc(payments.createdAt))
      .limit(100),
  };
}
