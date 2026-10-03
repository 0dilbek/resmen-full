import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
const identity = vi.hoisted(() => ({
  userId: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
}));
vi.mock("@/modules/auth/server", () => ({
  getSession: async () => ({
    user: { id: identity.userId, emailVerified: true },
    session: { id: identity.sessionId },
  }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (fn: () => unknown) => fn,
}));
import { db, pool } from "@/infrastructure/db";
import { user, session } from "@/modules/auth/schema";
import { restaurants } from "@/modules/restaurants/schema";
import { branches } from "@/modules/branches/schema";
import { memberships, auditLogs } from "@/modules/memberships/schema";
import { platformGrants } from "@/modules/platform-admin/schema";
import { platformOverview } from "@/modules/platform-admin/queries";
import { resolvePlatform } from "@/modules/platform-admin/server";
import { platformCommand } from "@/modules/platform-admin/actions";
import { resolveActor, withTenant } from "@/modules/memberships/server";
import { plans, subscriptions, payments } from "@/modules/billing/schema";
import { checkQuota, entitlement } from "@/modules/billing/server";
const run = process.env.DATABASE_URL?.includes("127.0.0.1")
  ? describe
  : describe.skip;
run("platform privilege and billing boundaries", () => {
  const admin = identity.userId,
    adminSession = identity.sessionId,
    owner = randomUUID(),
    ownerSession = randomUUID(),
    tenant = randomUUID(),
    foreign = randomUUID(),
    plan = randomUUID();
  const old = new Date(Date.now() - 600_000),
    fresh = new Date(Date.now() - 60_000);
  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: admin,
        name: "Admin",
        email: `${admin}@example.test`,
        emailVerified: true,
        twoFactorEnabled: true,
        updatedAt: old,
      },
      {
        id: owner,
        name: "Owner",
        email: `${owner}@example.test`,
        emailVerified: true,
        twoFactorEnabled: false,
        updatedAt: old,
      },
    ]);
    await db.insert(session).values([
      {
        id: adminSession,
        token: randomUUID(),
        userId: admin,
        createdAt: fresh,
        expiresAt: new Date(Date.now() + 3600_000),
      },
      {
        id: ownerSession,
        token: randomUUID(),
        userId: owner,
        createdAt: fresh,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    ]);
    await db.insert(platformGrants).values({ userId: admin, createdAt: old });
    await db.insert(restaurants).values([
      { id: tenant, name: "Billing", slug: tenant },
      { id: foreign, name: "Foreign", slug: foreign },
    ]);
    await db.insert(memberships).values({
      restaurantId: tenant,
      userId: owner,
      role: "OWNER",
      allBranches: true,
    });
    await db.insert(branches).values({
      restaurantId: tenant,
      name: "Main",
      slug: "main",
      isDefault: true,
    });
    await db.insert(plans).values({
      id: plan,
      code: plan,
      name: "Two branches",
      priceMinor: 10000n,
      currency: "UZS",
      limits: {
        branches: 2,
        products: 200,
        members: 6,
        storageMb: 200,
        ordering: true,
      },
    });
  });
  afterAll(async () => {
    identity.userId = admin;
    identity.sessionId = adminSession;
    await db
      .delete(payments)
      .where(inArray(payments.restaurantId, [tenant, foreign]));
    await db
      .delete(subscriptions)
      .where(inArray(subscriptions.restaurantId, [tenant, foreign]));
    await db.delete(plans).where(eq(plans.id, plan));
    await db
      .delete(auditLogs)
      .where(inArray(auditLogs.actorId, [admin, owner]));
    await db.delete(memberships).where(eq(memberships.restaurantId, tenant));
    await db.delete(branches).where(eq(branches.restaurantId, tenant));
    await db
      .delete(restaurants)
      .where(inArray(restaurants.id, [tenant, foreign]));
    await db
      .delete(platformGrants)
      .where(inArray(platformGrants.userId, [admin, owner]));
    await db.delete(session).where(inArray(session.userId, [admin, owner]));
    await db.delete(user).where(inArray(user.id, [admin, owner]));
    await pool.end();
  });
  it("does not mix platform and tenant privileges", async () => {
    await expect(
      resolvePlatform(db, adminSession, admin),
    ).resolves.toMatchObject({ userId: admin });
    await expect(
      resolveActor(db, admin, tenant, "restaurant:read"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      resolvePlatform(db, ownerSession, owner),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("loads platform restaurant owners through a scoped search", async () => {
    const result = await platformOverview({ q: tenant, page: 1 });
    expect(result.tenants).toHaveLength(1);
    expect(result.tenants[0].owners).toBe(`${owner}@example.test`);
  });
  it("rejects stale, pre-grant, and non-MFA sessions", async () => {
    await db
      .update(session)
      .set({ createdAt: new Date(Date.now() - 20 * 60_000) })
      .where(eq(session.id, adminSession));
    await expect(
      resolvePlatform(db, adminSession, admin),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await db
      .update(session)
      .set({ createdAt: fresh })
      .where(eq(session.id, adminSession));
    await db
      .update(platformGrants)
      .set({ createdAt: new Date() })
      .where(eq(platformGrants.userId, admin));
    await expect(
      resolvePlatform(db, adminSession, admin),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await db
      .update(platformGrants)
      .set({ createdAt: old })
      .where(eq(platformGrants.userId, admin));
    await db
      .update(user)
      .set({ twoFactorEnabled: false })
      .where(eq(user.id, admin));
    await expect(
      resolvePlatform(db, adminSession, admin),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db
      .update(user)
      .set({ twoFactorEnabled: true })
      .where(eq(user.id, admin));
  });
  it("audits real platform actor and rejects tenant owner commands", async () => {
    expect(
      await platformCommand({
        kind: "restaurant",
        id: tenant,
        status: "SUSPENDED",
        reason: "Abuse investigation",
      }),
    ).toEqual({ ok: true });
    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.restaurantId, tenant),
          eq(auditLogs.action, "platform.restaurant"),
        ),
      );
    expect(audit.actorId).toBe(admin);
    expect(audit.reason).toBe("Abuse investigation");
    identity.userId = owner;
    identity.sessionId = ownerSession;
    expect(
      await platformCommand({
        kind: "restaurant",
        id: tenant,
        status: "ACTIVE",
        reason: "Self reactivation",
      }),
    ).toMatchObject({ ok: false, error: "FORBIDDEN" });
    identity.userId = admin;
    identity.sessionId = adminSession;
    expect(
      await platformCommand({
        kind: "restaurant",
        id: tenant,
        status: "DRAFT",
        reason: "Investigation resolved",
      }),
    ).toEqual({ ok: true });
  });
  it("enforces quotas under tenant locks and grants explicit subscribed limits", async () => {
    identity.userId = owner;
    identity.sessionId = ownerSession;
    await expect(
      withTenant(tenant, "branch:manage", (tx) =>
        checkQuota(tx, tenant, "branches"),
      ),
    ).rejects.toMatchObject({ code: "PLAN_LIMIT" });
    identity.userId = admin;
    identity.sessionId = adminSession;
    expect(
      await platformCommand({
        kind: "subscription",
        restaurantId: tenant,
        planId: plan,
        endsAt: new Date(Date.now() + 86400_000).toISOString(),
        reason: "Signed offline agreement",
      }),
    ).toEqual({ ok: true });
    expect((await entitlement(db, tenant)).limits.branches).toBe(2);
    identity.userId = owner;
    identity.sessionId = ownerSession;
    await expect(
      withTenant(tenant, "branch:manage", (tx) =>
        checkQuota(tx, tenant, "branches"),
      ),
    ).resolves.toBeUndefined();
    identity.userId = admin;
    identity.sessionId = adminSession;
  });
  it("rejects cross-tenant payment references in both application and database", async () => {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.restaurantId, tenant));
    expect(
      await platformCommand({
        kind: "payment",
        restaurantId: foreign,
        subscriptionId: sub.id,
        amountMinor: "10000",
        reference: "forged",
        reason: "Invalid tenant reference",
      }),
    ).toMatchObject({ ok: false, error: "NOT_FOUND" });
    await expect(
      db.insert(payments).values({
        restaurantId: foreign,
        subscriptionId: sub.id,
        amountMinor: 10000n,
        currency: "UZS",
        reference: "forged-db",
        recordedBy: admin,
      }),
    ).rejects.toThrow();
    expect(
      await platformCommand({
        kind: "payment",
        restaurantId: tenant,
        subscriptionId: sub.id,
        amountMinor: "10000",
        reference: "bank-001",
        reason: "Matched bank transfer",
      }),
    ).toEqual({ ok: true });
    expect(
      await platformCommand({
        kind: "payment",
        restaurantId: tenant,
        subscriptionId: sub.id,
        amountMinor: "10000",
        reference: "bank-001",
        reason: "Repeated bank transfer",
      }),
    ).toMatchObject({ ok: false, error: "CONFLICT" });
    const rows = await db
      .select()
      .from(payments)
      .where(eq(payments.restaurantId, tenant));
    expect(rows).toHaveLength(1);
    expect(rows[0].currency).toBe("UZS");
  });
  it("falls back to starter limits after cancellation and honors grant revocation", async () => {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.restaurantId, tenant));
    expect(
      await platformCommand({
        kind: "cancelSubscription",
        restaurantId: tenant,
        id: sub.id,
        reason: "Subscription cancelled",
      }),
    ).toEqual({ ok: true });
    expect((await entitlement(db, tenant)).limits.branches).toBe(1);
    await db
      .update(platformGrants)
      .set({ active: false })
      .where(eq(platformGrants.userId, admin));
    await expect(
      resolvePlatform(db, adminSession, admin),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
