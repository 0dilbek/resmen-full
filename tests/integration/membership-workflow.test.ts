import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
const identity = vi.hoisted(() => ({
  id: crypto.randomUUID(),
  email: "",
  createdAt: new Date(),
}));
vi.mock("@/modules/auth/server", () => ({
  getSession: async () => ({
    user: { id: identity.id, email: identity.email, emailVerified: true },
    session: { createdAt: identity.createdAt },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { db, pool } from "@/infrastructure/db";
import { user } from "@/modules/auth/schema";
import { restaurants } from "@/modules/restaurants/schema";
import { branches } from "@/modules/branches/schema";
import {
  memberships,
  memberBranches,
  invitations,
  invitationBranches,
  auditLogs,
} from "@/modules/memberships/schema";
import {
  updateMemberAccess,
  transferOwnership,
  inviteMember,
  acceptInvitation,
} from "@/modules/memberships/actions";
const run = process.env.DATABASE_URL?.includes("127.0.0.1")
  ? describe
  : describe.skip;
run("membership workflow protection", () => {
  const owner = identity.id,
    admin = randomUUID(),
    cashier = randomUUID(),
    invitee = randomUUID(),
    tenant = randomUUID(),
    foreign = randomUUID(),
    branch = randomUUID(),
    foreignBranch = randomUUID(),
    ownerMember = randomUUID(),
    adminMember = randomUUID(),
    cashierMember = randomUUID();
  beforeAll(async () => {
    await db.insert(user).values(
      [owner, admin, cashier, invitee].map((id) => ({
        id,
        name: "Team",
        email: `${id}@example.test`,
        emailVerified: true,
      })),
    );
    await db.insert(restaurants).values([
      { id: tenant, name: "Team", slug: tenant },
      { id: foreign, name: "Other", slug: foreign },
    ]);
    await db.insert(branches).values([
      { id: branch, restaurantId: tenant, name: "Main", slug: "main" },
      { id: foreignBranch, restaurantId: foreign, name: "Other", slug: "main" },
    ]);
    await db.insert(memberships).values([
      {
        id: ownerMember,
        restaurantId: tenant,
        userId: owner,
        role: "OWNER",
        allBranches: true,
      },
      {
        id: adminMember,
        restaurantId: tenant,
        userId: admin,
        role: "ADMIN",
        allBranches: true,
      },
      {
        id: cashierMember,
        restaurantId: tenant,
        userId: cashier,
        role: "CASHIER",
        allBranches: false,
      },
    ]);
    await db.insert(memberBranches).values({
      restaurantId: tenant,
      membershipId: cashierMember,
      branchId: branch,
    });
  });
  afterAll(async () => {
    await db
      .delete(invitationBranches)
      .where(eq(invitationBranches.restaurantId, tenant));
    await db.delete(invitations).where(eq(invitations.restaurantId, tenant));
    await db.delete(auditLogs).where(eq(auditLogs.restaurantId, tenant));
    await db
      .delete(memberBranches)
      .where(eq(memberBranches.restaurantId, tenant));
    await db.delete(memberships).where(eq(memberships.restaurantId, tenant));
    await db
      .delete(branches)
      .where(inArray(branches.restaurantId, [tenant, foreign]));
    await db
      .delete(restaurants)
      .where(inArray(restaurants.id, [tenant, foreign]));
    await db
      .delete(user)
      .where(inArray(user.id, [owner, admin, cashier, invitee]));
    await pool.end();
  });
  it("rejects forged branches and admin escalation", async () => {
    expect(
      await updateMemberAccess(tenant, {
        memberId: cashierMember,
        role: "MANAGER",
        allBranches: false,
        branchIds: [foreignBranch],
      }),
    ).toMatchObject({ ok: false, error: "NOT_FOUND" });
    identity.id = admin;
    expect(
      await updateMemberAccess(tenant, {
        memberId: cashierMember,
        role: "ADMIN",
        allBranches: true,
        branchIds: [],
      }),
    ).toMatchObject({ ok: false, error: "FORBIDDEN" });
    expect(
      await updateMemberAccess(tenant, {
        memberId: ownerMember,
        role: "MANAGER",
        allBranches: false,
        branchIds: [branch],
      }),
    ).toMatchObject({ ok: false, error: "FORBIDDEN" });
    expect(
      await updateMemberAccess(tenant, {
        memberId: cashierMember,
        role: "MANAGER",
        allBranches: false,
        branchIds: [branch],
      }),
    ).toEqual({ ok: true });
    identity.id = owner;
  });
  it("invalidates invitations whose inviter was revoked", async () => {
    identity.id = admin;
    const result = await inviteMember(tenant, {
      email: `${invitee}@example.test`,
      role: "CASHIER",
      allBranches: false,
      branchIds: [branch],
    });
    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) throw Error("invite failed");
    await db
      .update(memberships)
      .set({ active: false })
      .where(eq(memberships.id, adminMember));
    identity.id = invitee;
    identity.email = `${invitee}@example.test`;
    expect(await acceptInvitation(result.data.token)).toMatchObject({
      ok: false,
      error: "NOT_FOUND",
    });
    await db
      .update(memberships)
      .set({ active: true })
      .where(eq(memberships.id, adminMember));
    identity.id = owner;
  });
  it("requires recent authentication before transfer", async () => {
    identity.createdAt = new Date(Date.now() - 20 * 60_000);
    expect(
      await transferOwnership(tenant, { memberId: adminMember, confirm: true }),
    ).toMatchObject({ ok: false, error: "UNAUTHENTICATED" });
    identity.createdAt = new Date();
  });
  it("serializes competing ownership transfers and preserves exactly one owner", async () => {
    const results = await Promise.all([
      transferOwnership(tenant, { memberId: adminMember, confirm: true }),
      transferOwnership(tenant, { memberId: cashierMember, confirm: true }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const owners = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.restaurantId, tenant),
          eq(memberships.role, "OWNER"),
          eq(memberships.active, true),
        ),
      );
    expect(owners).toHaveLength(1);
    expect(owners[0].userId).not.toBe(owner);
  });
});
