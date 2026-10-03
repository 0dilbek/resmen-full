import { randomUUID, randomBytes } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "@/infrastructure/db";
import {
  restaurants,
  restaurantSettings,
  restaurantSlugs,
} from "@/modules/restaurants/schema";
import { branches, branchSlugs } from "@/modules/branches/schema";
import { menus } from "@/modules/menus/schema";
import { categories, categoryTranslations } from "@/modules/categories/schema";
import { products, productTranslations } from "@/modules/products/schema";
import { diningTables, qrCodes } from "@/modules/qr/schema";
import { resolveQr, qrImage } from "@/modules/qr/server";
import { recordPublicEvent } from "@/modules/analytics/server";
import { analyticsEvents } from "@/modules/analytics/schema";
import { publicGate, projectMenu } from "@/modules/menus/public";
const run = process.env.DATABASE_URL?.includes("127.0.0.1")
  ? describe
  : describe.skip;
run("public projection publication boundary", () => {
  const table = randomUUID(),
    qrToken = randomBytes(24).toString("base64url");
  const tenant = randomUUID(),
    branch = randomUUID(),
    menu = randomUUID(),
    category = randomUUID(),
    live = randomUUID(),
    draft = randomUUID(),
    slug = `projection-${randomUUID()}`;
  beforeAll(async () => {
    await db
      .insert(restaurants)
      .values({ id: tenant, name: "Public test", slug, status: "ACTIVE" });
    await db.insert(restaurantSettings).values({ restaurantId: tenant });
    await db.insert(restaurantSlugs).values({ restaurantId: tenant, slug });
    await db.insert(branches).values({
      id: branch,
      restaurantId: tenant,
      name: "Main",
      slug: "main",
      isDefault: true,
    });
    await db
      .insert(branchSlugs)
      .values({ restaurantId: tenant, branchId: branch, slug: "main" });
    await db.insert(menus).values({
      id: menu,
      restaurantId: tenant,
      branchId: branch,
      published: true,
    });
    await db.insert(diningTables).values({
      id: table,
      restaurantId: tenant,
      branchId: branch,
      label: "12",
    });
    await db.insert(qrCodes).values({
      restaurantId: tenant,
      branchId: branch,
      tableId: table,
      kind: "TABLE",
      label: "12",
      token: qrToken,
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
    await db.insert(products).values([
      {
        id: live,
        restaurantId: tenant,
        menuId: menu,
        categoryId: category,
        priceMinor: 12345n,
        currency: "UZS",
        published: true,
      },
      {
        id: draft,
        restaurantId: tenant,
        menuId: menu,
        categoryId: category,
        priceMinor: 100n,
        currency: "UZS",
        published: false,
      },
    ]);
    await db.insert(productTranslations).values([
      { restaurantId: tenant, productId: live, locale: "uz", name: "Osh" },
      {
        restaurantId: tenant,
        productId: draft,
        locale: "uz",
        name: "PRIVATE DRAFT",
      },
    ]);
  });
  afterAll(async () => {
    await db
      .delete(analyticsEvents)
      .where(eq(analyticsEvents.restaurantId, tenant));
    await db
      .delete(productTranslations)
      .where(eq(productTranslations.restaurantId, tenant));
    await db.delete(products).where(eq(products.restaurantId, tenant));
    await db
      .delete(categoryTranslations)
      .where(eq(categoryTranslations.restaurantId, tenant));
    await db.delete(categories).where(eq(categories.restaurantId, tenant));
    await db.delete(menus).where(eq(menus.restaurantId, tenant));
    await db.delete(qrCodes).where(eq(qrCodes.restaurantId, tenant));
    await db.delete(diningTables).where(eq(diningTables.restaurantId, tenant));
    await db.delete(branchSlugs).where(eq(branchSlugs.restaurantId, tenant));
    await db.delete(branches).where(eq(branches.restaurantId, tenant));
    await db
      .delete(restaurantSlugs)
      .where(eq(restaurantSlugs.restaurantId, tenant));
    await db
      .delete(restaurantSettings)
      .where(eq(restaurantSettings.restaurantId, tenant));
    await db.delete(restaurants).where(eq(restaurants.id, tenant));
    await pool.end();
  });
  it("returns only explicit published fields with default-language fallback", async () => {
    const gate = await publicGate(slug, "main");
    const data = await projectMenu(gate, "en");
    expect(data.products).toHaveLength(1);
    expect(data.products[0].name).toBe("Osh");
    expect(data.products[0].priceMinor).toBe("12345");
    expect(data.categories[0].name).toBe("Taomlar");
    expect(JSON.stringify(data)).not.toMatch(
      /PRIVATE DRAFT|createdAt|published|membership|email/,
    );
  });
  it("uncached gate immediately rejects a suspended restaurant", async () => {
    await db
      .update(restaurants)
      .set({ status: "SUSPENDED" })
      .where(eq(restaurants.id, tenant));
    await expect(publicGate(slug, "main")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await db
      .update(restaurants)
      .set({ status: "ACTIVE" })
      .where(eq(restaurants.id, tenant));
  });
  it("keeps QR identity stable across profile and catalog updates", async () => {
    const first = await resolveQr(qrToken);
    expect(first.table?.label).toBe("12");
    await db
      .update(restaurants)
      .set({ name: "Renamed restaurant" })
      .where(eq(restaurants.id, tenant));
    await db
      .update(menus)
      .set({ catalogRevision: 25 })
      .where(eq(menus.restaurantId, tenant));
    const next = await resolveQr(qrToken);
    expect(next.code.id).toBe(first.code.id);
    expect(next.restaurant.name).toBe("Renamed restaurant");
    expect(next.menu.id).toBe(first.menu.id);
  });
  it("rejects revoked QR codes and inactive tables", async () => {
    await db
      .update(qrCodes)
      .set({ active: false })
      .where(eq(qrCodes.restaurantId, tenant));
    await expect(resolveQr(qrToken)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await db
      .update(qrCodes)
      .set({ active: true })
      .where(eq(qrCodes.restaurantId, tenant));
    await db
      .update(diningTables)
      .set({ active: false })
      .where(eq(diningTables.restaurantId, tenant));
    await expect(resolveQr(qrToken)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await db
      .update(diningTables)
      .set({ active: true })
      .where(eq(diningTables.restaurantId, tenant));
  });
  it("enforces QR shapes in PostgreSQL and exports both formats", async () => {
    await expect(
      db.insert(qrCodes).values({
        restaurantId: tenant,
        branchId: branch,
        kind: "TABLE",
        label: "forged",
        token: randomBytes(24).toString("base64url"),
      }),
    ).rejects.toThrow();
    const png = await qrImage(qrToken, "png");
    expect(Buffer.isBuffer(png) && png.subarray(1, 4).toString()).toBe("PNG");
    const svg = await qrImage(qrToken, "svg");
    expect(typeof svg === "string" && svg.startsWith("<svg")).toBe(true);
  });
  it("deduplicates public analytics and excludes draft or forged product references", async () => {
    const id = randomUUID();
    const event = {
      id,
      slug,
      branch: "main",
      locale: "uz",
      kind: "PRODUCT_VIEW",
      productId: live,
    };
    await recordPublicEvent(event);
    await recordPublicEvent(event);
    const records = await db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.restaurantId, tenant));
    expect(records).toHaveLength(1);
    expect(records[0].menuId).toBe(menu);
    expect(records[0].templateId).toBe("minimal-01");
    await expect(
      recordPublicEvent({ ...event, id: randomUUID(), productId: draft }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      recordPublicEvent({
        ...event,
        id: randomUUID(),
        productId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      db.insert(analyticsEvents).values({
        id: randomUUID(),
        restaurantId: tenant,
        branchId: randomUUID(),
        menuId: menu,
        kind: "MENU_VIEW",
        locale: "uz",
        templateId: "minimal-01",
      }),
    ).rejects.toThrow();
  });
  it("rejects unpublished menus and inactive branches", async () => {
    await db
      .update(menus)
      .set({ published: false })
      .where(eq(menus.restaurantId, tenant));
    await expect(publicGate(slug, "main")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await db
      .update(menus)
      .set({ published: true })
      .where(eq(menus.restaurantId, tenant));
    await db
      .update(branches)
      .set({ active: false })
      .where(eq(branches.restaurantId, tenant));
    await expect(publicGate(slug, "main")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
