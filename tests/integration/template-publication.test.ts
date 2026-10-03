import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
const identity = vi.hoisted(() => ({ id: crypto.randomUUID() }));
vi.mock("@/modules/auth/server", () => ({
  getSession: async () => ({ user: { id: identity.id, emailVerified: true } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { db, pool } from "@/infrastructure/db";
import { user } from "@/modules/auth/schema";
import { restaurants, restaurantSettings } from "@/modules/restaurants/schema";
import { branches } from "@/modules/branches/schema";
import { menus } from "@/modules/menus/schema";
import { memberships, auditLogs } from "@/modules/memberships/schema";
import { categories, categoryTranslations } from "@/modules/categories/schema";
import {
  products,
  productTranslations,
  mediaAssets,
} from "@/modules/products/schema";
import { templateConfigs, templateRevisions } from "@/modules/templates/schema";
import { defaultTheme } from "@/modules/templates/config";
import { saveDraft, publishDesign } from "@/modules/templates/actions";
import { checkThemeMedia, publicTheme } from "@/modules/templates/server";
const run = process.env.DATABASE_URL?.includes("127.0.0.1")
  ? describe
  : describe.skip;
run("transactional template publication", () => {
  const tenant = randomUUID(),
    foreign = randomUUID(),
    branch = randomUUID(),
    menu = randomUUID(),
    foreignMenu = randomUUID(),
    category = randomUUID(),
    product = randomUUID(),
    foreignMedia = randomUUID();
  beforeAll(async () => {
    await db.insert(user).values({
      id: identity.id,
      name: "Design owner",
      email: `${identity.id}@example.test`,
      emailVerified: true,
    });
    await db.insert(restaurants).values([
      { id: tenant, name: "Design", slug: tenant, status: "ACTIVE" },
      { id: foreign, name: "Foreign", slug: foreign },
    ]);
    await db.insert(restaurantSettings).values({ restaurantId: tenant });
    const [other] = await db
      .insert(branches)
      .values({ restaurantId: foreign, name: "Other", slug: "main" })
      .returning();
    await db.insert(branches).values({
      id: branch,
      restaurantId: tenant,
      name: "Main",
      slug: "main",
      isDefault: true,
    });
    await db.insert(menus).values([
      { id: menu, restaurantId: tenant, branchId: branch },
      { id: foreignMenu, restaurantId: foreign, branchId: other.id },
    ]);
    await db.insert(mediaAssets).values({
      id: foreignMedia,
      restaurantId: foreign,
      menuId: foreignMenu,
      objectKey: `test-${foreignMedia}`,
      bytes: 100,
      width: 10,
      height: 10,
      state: "READY",
    });
    await db.insert(memberships).values({
      restaurantId: tenant,
      userId: identity.id,
      role: "OWNER",
      allBranches: true,
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
      priceMinor: 100n,
      currency: "UZS",
      published: true,
    });
    await db.insert(productTranslations).values({
      restaurantId: tenant,
      productId: product,
      locale: "uz",
      name: "Osh",
    });
  });
  afterAll(async () => {
    await db
      .delete(templateConfigs)
      .where(eq(templateConfigs.restaurantId, tenant));
    await db
      .delete(templateRevisions)
      .where(eq(templateRevisions.restaurantId, tenant));
    await db.delete(auditLogs).where(eq(auditLogs.restaurantId, tenant));
    await db
      .delete(productTranslations)
      .where(eq(productTranslations.restaurantId, tenant));
    await db.delete(products).where(eq(products.restaurantId, tenant));
    await db
      .delete(categoryTranslations)
      .where(eq(categoryTranslations.restaurantId, tenant));
    await db.delete(categories).where(eq(categories.restaurantId, tenant));
    await db.delete(memberships).where(eq(memberships.restaurantId, tenant));
    await db.delete(mediaAssets).where(eq(mediaAssets.id, foreignMedia));
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
  it("keeps a saved draft private until an authorized publication", async () => {
    expect(
      (
        await saveDraft(tenant, {
          menuId: menu,
          expectedVersion: 0,
          config: defaultTheme("luxury-01"),
        })
      ).ok,
    ).toBe(true);
    expect((await publicTheme(tenant, menu)).config.templateId).toBe(
      "minimal-01",
    );
    expect(
      (await publishDesign(tenant, { menuId: menu, expectedVersion: 1 })).ok,
    ).toBe(true);
    expect((await publicTheme(tenant, menu)).config.templateId).toBe(
      "luxury-01",
    );
  });
  it("allows only one of two editors at the same draft version to save", async () => {
    const results = await Promise.all([
      saveDraft(tenant, {
        menuId: menu,
        expectedVersion: 1,
        config: defaultTheme("fastfood-01"),
      }),
      saveDraft(tenant, {
        menuId: menu,
        expectedVersion: 1,
        config: defaultTheme("uzbek-modern-01"),
      }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([
      { ok: false, error: "CONFLICT" },
    ]);
    expect((await publicTheme(tenant, menu)).config.templateId).toBe(
      "luxury-01",
    );
  });
  it("rejects stale publish and forged menu references", async () => {
    expect(
      await publishDesign(tenant, { menuId: menu, expectedVersion: 1 }),
    ).toEqual({ ok: false, error: "CONFLICT" });
    expect(
      await saveDraft(tenant, {
        menuId: foreignMenu,
        expectedVersion: 0,
        config: defaultTheme(),
      }),
    ).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(
      await saveDraft(foreign, {
        menuId: foreignMenu,
        expectedVersion: 0,
        config: defaultTheme(),
      }),
    ).toEqual({ ok: false, error: "NOT_FOUND" });
  });
  it("persists premium settings only after an authorized publication", async () => {
    const { designSettingsSchema } = await import("@/modules/templates/design");
    const config = {
      ...defaultTheme("food-cards-3d"),
      design: designSettingsSchema.parse({
        show3D: true,
        imageStyle: "organic",
        hero: "3d",
        animation: "medium",
      }),
    };
    expect(
      (await saveDraft(tenant, { menuId: menu, expectedVersion: 2, config }))
        .ok,
    ).toBe(true);
    expect((await publicTheme(tenant, menu)).config.templateId).toBe(
      "luxury-01",
    );
    expect(
      (await publishDesign(tenant, { menuId: menu, expectedVersion: 3 })).ok,
    ).toBe(true);
    expect((await publicTheme(tenant, menu)).config).toEqual(config);
  });
  it("rejects forged media references for preview and draft publication", async () => {
    const config = {
      ...defaultTheme("editorial-magazine"),
      coverMediaId: foreignMedia,
    };
    await expect(
      db.transaction((tx) => checkThemeMedia(tx, tenant, menu, config)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(
      await saveDraft(tenant, { menuId: menu, expectedVersion: 3, config }),
    ).toEqual({ ok: false, error: "NOT_FOUND" });
  });
  it("database refuses a cross-tenant published revision pointer", async () => {
    const [revision] = await db
      .select()
      .from(templateRevisions)
      .where(eq(templateRevisions.restaurantId, tenant));
    await expect(
      db.insert(templateConfigs).values({
        restaurantId: foreign,
        menuId: foreignMenu,
        draft: defaultTheme(),
        publishedRevisionId: revision.id,
      }),
    ).rejects.toThrow();
  });
});
