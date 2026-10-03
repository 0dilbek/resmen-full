import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "@/infrastructure/db";
import { user } from "@/modules/auth/schema";
import { restaurants } from "@/modules/restaurants/schema";
import { branches } from "@/modules/branches/schema";
import { categories } from "@/modules/categories/schema";
import { products } from "@/modules/products/schema";
import { menus } from "@/modules/menus/schema";
import { memberships, memberBranches } from "@/modules/memberships/schema";
import { resolveActor, requireBranch } from "@/modules/memberships/server";
const run = process.env.DATABASE_URL?.includes("127.0.0.1")
  ? describe
  : describe.skip;
run("PostgreSQL tenant isolation", () => {
  const tenantA = randomUUID(),
    tenantB = randomUUID(),
    branchA = randomUUID(),
    branchB = randomUUID(),
    owner = randomUUID(),
    cashier = randomUUID(),
    membershipId = randomUUID();
  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: owner,
        name: "Test owner",
        email: `${owner}@example.test`,
        emailVerified: true,
      },
      {
        id: cashier,
        name: "Test cashier",
        email: `${cashier}@example.test`,
        emailVerified: true,
      },
    ]);
    await db.insert(restaurants).values([
      { id: tenantA, name: "A", slug: tenantA },
      { id: tenantB, name: "B", slug: tenantB },
    ]);
    await db.insert(branches).values([
      { id: branchA, restaurantId: tenantA, name: "A", slug: "main" },
      { id: branchB, restaurantId: tenantB, name: "B", slug: "main" },
    ]);
    await db.insert(memberships).values([
      {
        restaurantId: tenantA,
        userId: owner,
        role: "OWNER",
        allBranches: true,
      },
      {
        id: membershipId,
        restaurantId: tenantA,
        userId: cashier,
        role: "CASHIER",
        allBranches: false,
      },
    ]);
    await db
      .insert(memberBranches)
      .values({ restaurantId: tenantA, membershipId, branchId: branchA });
  });
  afterAll(async () => {
    await db
      .delete(memberBranches)
      .where(eq(memberBranches.restaurantId, tenantA));
    await db.delete(memberships).where(eq(memberships.restaurantId, tenantA));
    await db
      .delete(categories)
      .where(inArray(categories.restaurantId, [tenantA, tenantB]));
    await db
      .delete(menus)
      .where(inArray(menus.restaurantId, [tenantA, tenantB]));
    await db
      .delete(branches)
      .where(inArray(branches.restaurantId, [tenantA, tenantB]));
    await db
      .delete(restaurants)
      .where(inArray(restaurants.id, [tenantA, tenantB]));
    await db.delete(user).where(inArray(user.id, [owner, cashier]));
    await pool.end();
  });
  it("rejects global ID access to a foreign restaurant", async () => {
    await expect(
      resolveActor(db, owner, tenantB, "restaurant:read"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("does not give cashiers owner permissions", async () => {
    await expect(
      resolveActor(db, cashier, tenantA, "member:manage"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("checks cashier branch assignments server-side", async () => {
    const actor = await resolveActor(db, cashier, tenantA, "order:read");
    expect(() => requireBranch(actor, branchA)).not.toThrow();
    expect(() => requireBranch(actor, branchB)).toThrow();
  });
  it("database refuses a cross-tenant menu branch", async () => {
    await expect(
      db.insert(menus).values({ restaurantId: tenantA, branchId: branchB }),
    ).rejects.toThrow();
  });
  it("database refuses a cross-tenant branch grant", async () => {
    await expect(
      db
        .insert(memberBranches)
        .values({ restaurantId: tenantA, membershipId, branchId: branchB }),
    ).rejects.toThrow();
  });
  it("database refuses a category from another menu in the same tenant", async () => {
    const [b] = await db
      .insert(branches)
      .values({ restaurantId: tenantA, name: "Second", slug: "second" })
      .returning();
    const [m1, m2] = await db
      .insert(menus)
      .values([
        { restaurantId: tenantA, branchId: branchA },
        { restaurantId: tenantA, branchId: b.id },
      ])
      .returning();
    const [category] = await db
      .insert(categories)
      .values({ restaurantId: tenantA, menuId: m1.id })
      .returning();
    await expect(
      db.insert(products).values({
        restaurantId: tenantA,
        menuId: m2.id,
        categoryId: category.id,
        priceMinor: 100n,
        currency: "UZS",
      }),
    ).rejects.toThrow();
  });
  it("revocation is visible on the next read", async () => {
    await db
      .update(memberships)
      .set({ active: false })
      .where(eq(memberships.id, membershipId));
    await expect(
      resolveActor(db, cashier, tenantA, "order:read"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
