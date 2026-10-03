import { randomBytes, randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { eq, inArray, and, sql } from "drizzle-orm";
const identity = vi.hoisted(() => ({ id: crypto.randomUUID() }));
vi.mock("@/modules/auth/server", () => ({
  getSession: async () => ({ user: { id: identity.id, emailVerified: true } }),
}));
import { db, pool } from "@/infrastructure/db";
import { user } from "@/modules/auth/schema";
import { restaurants, restaurantSettings } from "@/modules/restaurants/schema";
import { branches } from "@/modules/branches/schema";
import { menus } from "@/modules/menus/schema";
import {
  memberships,
  memberBranches,
  auditLogs,
} from "@/modules/memberships/schema";
import { categories, categoryTranslations } from "@/modules/categories/schema";
import { products, productTranslations } from "@/modules/products/schema";
import {
  modifierGroups,
  modifierOptions,
  productModifierGroups,
} from "@/modules/modifiers/schema";
import { diningTables, qrCodes } from "@/modules/qr/schema";
import {
  orders,
  orderItems,
  orderItemModifiers,
  orderEvents,
  orderCounters,
} from "@/modules/orders/schema";
import {
  createOrder,
  guestReceipt,
  transitionOrder,
  orderBoard,
} from "@/modules/orders/server";
import type { CreateOrderInput } from "@/modules/orders/validation";
const run = process.env.DATABASE_URL?.includes("127.0.0.1")
  ? describe
  : describe.skip;
run("real PostgreSQL order integrity", () => {
  const tenant = randomUUID(),
    foreign = randomUUID(),
    branch = randomUUID(),
    otherBranch = randomUUID(),
    menu = randomUUID(),
    otherMenu = randomUUID(),
    category = randomUUID(),
    product = randomUUID(),
    table = randomUUID(),
    qr = randomUUID(),
    group = randomUUID(),
    option = randomUUID(),
    foreignOption = randomUUID(),
    token = randomBytes(24).toString("base64url"),
    guest = randomBytes(32).toString("base64url");
  let createdId = "";
  const input = (patch: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
    qrToken: token,
    idempotencyKey: randomUUID(),
    credential: guest,
    locale: "uz",
    notes: "",
    lines: [
      {
        productId: product,
        optionIds: [option],
        quantity: 2,
        note: "Less salt",
        expectedUnitMinor: "15000",
      },
    ],
    ...patch,
  });
  beforeAll(async () => {
    await db.insert(user).values({
      id: identity.id,
      name: "Cashier",
      email: `${identity.id}@example.test`,
      emailVerified: true,
    });
    await db.insert(restaurants).values([
      { id: tenant, name: "Orders", slug: tenant, status: "ACTIVE" },
      { id: foreign, name: "Foreign", slug: foreign, status: "ACTIVE" },
    ]);
    await db
      .insert(restaurantSettings)
      .values({ restaurantId: tenant, orderingEnabled: true });
    await db.insert(branches).values([
      {
        id: branch,
        restaurantId: tenant,
        name: "Main",
        slug: "main",
        isDefault: true,
      },
      { id: otherBranch, restaurantId: tenant, name: "Other", slug: "other" },
    ]);
    const [foreignBranch] = await db
      .insert(branches)
      .values({ restaurantId: foreign, name: "Foreign", slug: "main" })
      .returning();
    await db.insert(menus).values([
      { id: menu, restaurantId: tenant, branchId: branch, published: true },
      {
        id: otherMenu,
        restaurantId: tenant,
        branchId: otherBranch,
        published: true,
      },
    ]);
    const [foreignMenu] = await db
      .insert(menus)
      .values({ restaurantId: foreign, branchId: foreignBranch.id })
      .returning();
    const [member] = await db
      .insert(memberships)
      .values({
        restaurantId: tenant,
        userId: identity.id,
        role: "CASHIER",
        allBranches: false,
      })
      .returning();
    await db.insert(memberBranches).values({
      restaurantId: tenant,
      membershipId: member.id,
      branchId: branch,
    });
    await db
      .insert(categories)
      .values({ id: category, restaurantId: tenant, menuId: menu });
    await db.insert(categoryTranslations).values({
      restaurantId: tenant,
      categoryId: category,
      locale: "uz",
      name: "Taomlar",
    });
    await db.insert(products).values({
      id: product,
      restaurantId: tenant,
      menuId: menu,
      categoryId: category,
      priceMinor: 10000n,
      currency: "UZS",
      published: true,
    });
    await db.insert(productTranslations).values({
      restaurantId: tenant,
      productId: product,
      locale: "uz",
      name: "Osh",
    });
    await db.insert(modifierGroups).values({
      id: group,
      restaurantId: tenant,
      menuId: menu,
      names: { uz: "Qo‘shimcha", ru: "", en: "" },
      minSelections: 1,
      maxSelections: 1,
    });
    const [foreignGroup] = await db
      .insert(modifierGroups)
      .values({
        restaurantId: foreign,
        menuId: foreignMenu.id,
        names: { uz: "Foreign", ru: "", en: "" },
      })
      .returning();
    await db.insert(modifierOptions).values([
      {
        id: option,
        restaurantId: tenant,
        groupId: group,
        names: { uz: "Go‘sht", ru: "", en: "" },
        priceDeltaMinor: 5000n,
      },
      {
        id: foreignOption,
        restaurantId: foreign,
        groupId: foreignGroup.id,
        names: { uz: "Foreign option", ru: "", en: "" },
        priceDeltaMinor: 0n,
      },
    ]);
    await db.insert(productModifierGroups).values({
      restaurantId: tenant,
      menuId: menu,
      productId: product,
      groupId: group,
    });
    await db.insert(diningTables).values({
      id: table,
      restaurantId: tenant,
      branchId: branch,
      label: "07",
    });
    await db.insert(qrCodes).values({
      id: qr,
      restaurantId: tenant,
      branchId: branch,
      tableId: table,
      kind: "TABLE",
      label: "07",
      token,
    });
  });
  afterAll(async () => {
    await db
      .delete(orderItemModifiers)
      .where(eq(orderItemModifiers.restaurantId, tenant));
    await db.delete(orderItems).where(eq(orderItems.restaurantId, tenant));
    await db.delete(orderEvents).where(eq(orderEvents.restaurantId, tenant));
    await db.delete(orders).where(eq(orders.restaurantId, tenant));
    await db
      .delete(orderCounters)
      .where(eq(orderCounters.restaurantId, tenant));
    await db.delete(auditLogs).where(eq(auditLogs.restaurantId, tenant));
    await db.delete(qrCodes).where(eq(qrCodes.restaurantId, tenant));
    await db.delete(diningTables).where(eq(diningTables.restaurantId, tenant));
    await db
      .delete(productModifierGroups)
      .where(eq(productModifierGroups.restaurantId, tenant));
    await db
      .delete(modifierOptions)
      .where(inArray(modifierOptions.restaurantId, [tenant, foreign]));
    await db
      .delete(modifierGroups)
      .where(inArray(modifierGroups.restaurantId, [tenant, foreign]));
    await db
      .delete(productTranslations)
      .where(eq(productTranslations.restaurantId, tenant));
    await db.delete(products).where(eq(products.restaurantId, tenant));
    await db
      .delete(categoryTranslations)
      .where(eq(categoryTranslations.restaurantId, tenant));
    await db.delete(categories).where(eq(categories.restaurantId, tenant));
    await db
      .delete(memberBranches)
      .where(eq(memberBranches.restaurantId, tenant));
    await db.delete(memberships).where(eq(memberships.restaurantId, tenant));
    await db
      .delete(menus)
      .where(inArray(menus.restaurantId, [tenant, foreign]));
    await db
      .delete(branches)
      .where(inArray(branches.restaurantId, [tenant, foreign]));
    await db
      .delete(restaurantSettings)
      .where(eq(restaurantSettings.restaurantId, tenant));
    await db
      .delete(restaurants)
      .where(inArray(restaurants.id, [tenant, foreign]));
    await db.delete(user).where(eq(user.id, identity.id));
    await pool.end();
  });
  it("collapses simultaneous retries and preserves exact server prices", async () => {
    const payload = input();
    const results = await Promise.all([
      createOrder(payload),
      createOrder(payload),
    ]);
    expect(results[0].id).toBe(results[1].id);
    createdId = results[0].id;
    const receipt = await guestReceipt({
      orderId: createdId,
      credential: guest,
    });
    expect(receipt.totalMinor).toBe("30000");
    expect(receipt.lines[0].modifiers[0].priceDeltaMinor).toBe("5000");
    await expect(
      createOrder({ ...payload, notes: "different" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      guestReceipt({
        orderId: createdId,
        credential: randomBytes(32).toString("base64url"),
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects tampered prices, foreign options and missing required choices", async () => {
    const base = input();
    await expect(
      createOrder({
        ...base,
        lines: [{ ...base.lines[0], expectedUnitMinor: "1" }],
      }),
    ).rejects.toMatchObject({ code: "PRICE_CHANGED" });
    await expect(
      createOrder({
        ...base,
        lines: [{ ...base.lines[0], optionIds: [foreignOption] }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(
      createOrder({ ...base, lines: [{ ...base.lines[0], optionIds: [] }] }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
  it("allocates unique branch numbers under eight concurrent orders", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => createOrder(input())),
    );
    expect(new Set(results.map((r) => r.number)).size).toBe(8);
  });
  it("serializes a checkout against an in-flight catalog edit", async () => {
    let unlock!: () => void, entered!: () => void;
    const hold = new Promise<void>((r) => {
      unlock = r;
    });
    const locked = new Promise<void>((r) => {
      entered = r;
    });
    const write = db.transaction(async (tx) => {
      await tx
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, tenant))
        .for("update");
      await tx
        .update(products)
        .set({ priceMinor: 20000n })
        .where(
          and(eq(products.restaurantId, tenant), eq(products.id, product)),
        );
      entered();
      await hold;
    });
    await locked;
    const checkout = createOrder(input());
    unlock();
    await write;
    await expect(checkout).rejects.toMatchObject({ code: "PRICE_CHANGED" });
    expect(
      (await guestReceipt({ orderId: createdId, credential: guest }))
        .totalMinor,
    ).toBe("30000");
    await db
      .update(products)
      .set({ priceMinor: 10000n })
      .where(eq(products.restaurantId, tenant));
  });
  it("rejects illegal transitions and permits only one racing status update", async () => {
    await expect(
      transitionOrder(tenant, {
        orderId: createdId,
        expectedVersion: 1,
        nextStatus: "COMPLETED",
        reason: "",
        requestId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    const command = {
      orderId: createdId,
      expectedVersion: 1,
      nextStatus: "ACCEPTED" as const,
      reason: "",
      requestId: randomUUID(),
    };
    const outcomes = await Promise.allSettled([
      transitionOrder(tenant, command),
      transitionOrder(tenant, { ...command, requestId: randomUUID() }),
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    const [accepted] = await db
      .select()
      .from(orderEvents)
      .where(
        and(
          eq(orderEvents.restaurantId, tenant),
          eq(orderEvents.orderId, createdId),
          eq(orderEvents.version, 2),
        ),
      );
    await transitionOrder(tenant, {
      ...command,
      requestId: accepted.requestId,
    });
    const [count] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(orderEvents)
      .where(
        and(
          eq(orderEvents.restaurantId, tenant),
          eq(orderEvents.orderId, createdId),
        ),
      );
    expect(count.value).toBe(2);
  });
  it("keeps cashier reads branch-scoped and ordering flag authoritative", async () => {
    await expect(orderBoard(tenant, otherBranch, {})).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await db
      .update(restaurantSettings)
      .set({ orderingEnabled: false })
      .where(eq(restaurantSettings.restaurantId, tenant));
    await expect(createOrder(input())).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });
});
