import "server-only";
import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/infrastructure/db";
import { requirePlatform } from "./server";
import { restaurants } from "@/modules/restaurants/schema";
import { user } from "@/modules/auth/schema";
import { auditLogs } from "@/modules/memberships/schema";
import { plans, subscriptions, payments } from "@/modules/billing/schema";
import { orders } from "@/modules/orders/schema";
import { templateCatalog } from "@/modules/templates/schema";
import { supportTickets } from "@/modules/support/schema";
import { systemSettings } from "./settings";
export const adminQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).catch(1),
  q: z.string().trim().max(100).catch(""),
});
export async function platformOverview(input: unknown) {
  await requirePlatform();
  const { page, q } = adminQuerySchema.parse(input);
  const offset = (page - 1) * 30;
  const filter = q
    ? or(ilike(restaurants.name, `%${q}%`), ilike(restaurants.slug, `%${q}%`))
    : undefined;
  const [
    tenants,
    accounts,
    planRows,
    subscriptionRows,
    paymentRows,
    templates,
    tickets,
    audits,
    settings,
    tenantCount,
    userCount,
    orderCount,
    filteredCount,
  ] = await Promise.all([
    db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        status: restaurants.status,
        owners: sql<string>`(select string_agg(u.email, ', ') from membership m join auth_user u on u.id=m.user_id where m.restaurant_id="restaurant"."id" and m.role='OWNER' and m.active)`,
      })
      .from(restaurants)
      .where(filter)
      .orderBy(desc(restaurants.createdAt), desc(restaurants.id))
      .limit(30)
      .offset(offset),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.emailVerified,
        mfa: user.twoFactorEnabled,
      })
      .from(user)
      .where(
        q
          ? or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`))
          : undefined,
      )
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(30)
      .offset(offset),
    db.select().from(plans).orderBy(desc(plans.createdAt)).limit(100),
    db
      .select({
        id: subscriptions.id,
        restaurantId: subscriptions.restaurantId,
        name: restaurants.name,
        plan: plans.name,
        status: subscriptions.status,
        endsAt: subscriptions.endsAt,
      })
      .from(subscriptions)
      .innerJoin(restaurants, eq(restaurants.id, subscriptions.restaurantId))
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(30)
      .offset(offset),
    db
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt))
      .limit(30)
      .offset(offset),
    db.select().from(templateCatalog).orderBy(templateCatalog.id),
    db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.resolved, false))
      .orderBy(desc(supportTickets.createdAt))
      .limit(30)
      .offset(offset),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        actorId: auditLogs.actorId,
        restaurantId: auditLogs.restaurantId,
        reason: auditLogs.reason,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.scope, "platform"))
      .orderBy(desc(auditLogs.createdAt))
      .limit(30)
      .offset(offset),
    systemSettings(),
    db.select({ n: count() }).from(restaurants),
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(orders),
    db.select({ n: count() }).from(restaurants).where(filter),
  ]);
  return {
    page,
    q,
    tenants,
    accounts,
    plans: planRows,
    subscriptions: subscriptionRows,
    payments: paymentRows,
    templates,
    tickets,
    audits,
    settings,
    counts: {
      tenants: tenantCount[0].n,
      users: userCount[0].n,
      orders: orderCount[0].n,
    },
    pages: Math.max(1, Math.ceil(filteredCount[0].n / 30)),
  };
}
