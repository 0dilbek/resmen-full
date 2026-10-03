import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { db, type Transaction } from "@/infrastructure/db";
import {
  restaurants,
  restaurantSettings,
  restaurantSlugs,
} from "@/modules/restaurants/schema";
import { branches, branchSlugs } from "@/modules/branches/schema";
import { categories, categoryTranslations } from "@/modules/categories/schema";
import {
  products,
  productTranslations,
  productImages,
  mediaAssets,
} from "@/modules/products/schema";
import {
  modifierGroups,
  modifierOptions,
  productModifierGroups,
} from "@/modules/modifiers/schema";
import { AppError } from "@/infrastructure/errors";
import { isLocale, type Locale } from "@/i18n/config";
import { publicTheme } from "@/modules/templates/server";
import { menus } from "./schema";
import { systemSettings } from "@/modules/platform-admin/settings";
import { entitlement } from "@/modules/billing/server";
import { menuDataSchema } from "./contract";
const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/);
export async function publicGate(slug: string, branchSlug?: string) {
  if (
    !slugSchema.safeParse(slug).success ||
    (branchSlug && !slugSchema.safeParse(branchSlug).success)
  )
    throw new AppError("NOT_FOUND", 404);
  const [restaurant] = await db
    .select({ restaurant: restaurants, settings: restaurantSettings })
    .from(restaurantSlugs)
    .innerJoin(restaurants, eq(restaurants.id, restaurantSlugs.restaurantId))
    .innerJoin(
      restaurantSettings,
      eq(restaurantSettings.restaurantId, restaurants.id),
    )
    .where(
      and(eq(restaurantSlugs.slug, slug), eq(restaurants.status, "ACTIVE")),
    );
  if (!restaurant) throw new AppError("NOT_FOUND", 404);
  const [row] = await db
    .select({ branch: branches, menu: menus })
    .from(branches)
    .innerJoin(
      menus,
      and(
        eq(menus.restaurantId, branches.restaurantId),
        eq(menus.branchId, branches.id),
      ),
    )
    .leftJoin(
      branchSlugs,
      and(
        eq(branchSlugs.restaurantId, branches.restaurantId),
        eq(branchSlugs.branchId, branches.id),
      ),
    )
    .where(
      and(
        eq(branches.restaurantId, restaurant.restaurant.id),
        eq(branches.active, true),
        eq(menus.published, true),
        branchSlug
          ? eq(branchSlugs.slug, branchSlug)
          : eq(branches.isDefault, true),
      ),
    )
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", 404);
  return {
    ...restaurant,
    ...row,
    theme: await publicTheme(restaurant.restaurant.id, row.menu.id),
  };
}
export type MenuGate = Awaited<ReturnType<typeof publicGate>>;
export function localizedField<T extends { locale: Locale }>(
  rows: T[],
  locale: Locale,
  fallback: Locale,
  field: keyof T,
): string {
  const chosen = rows.find((r) => r.locale === locale)?.[field];
  const base = rows.find((r) => r.locale === fallback)?.[field];
  return typeof chosen === "string" && chosen
    ? chosen
    : typeof base === "string"
      ? base
      : "";
}
// Called only with a server-resolved gate. Preview callers must authorize before calling.
export async function projectMenu(
  gate: MenuGate,
  locale: Locale,
  includeDraft = false,
  transaction?: Transaction,
) {
  const tenant = gate.restaurant.id,
    menuId = gate.menu.id;
  const run = async (tx: Transaction) => {
    const cats = await tx
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.restaurantId, tenant),
          eq(categories.menuId, menuId),
          eq(categories.visible, true),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.id))
      .limit(100);
    const items = cats.length
      ? await tx
          .select()
          .from(products)
          .where(
            and(
              eq(products.restaurantId, tenant),
              eq(products.menuId, menuId),
              eq(products.archived, false),
              includeDraft ? undefined : eq(products.published, true),
              inArray(
                products.categoryId,
                cats.map((c) => c.id),
              ),
            ),
          )
          .orderBy(asc(products.sortOrder), asc(products.id))
          .limit(1000)
      : [];
    const catTexts = await (cats.length
      ? tx
          .select()
          .from(categoryTranslations)
          .where(
            and(
              eq(categoryTranslations.restaurantId, tenant),
              inArray(
                categoryTranslations.categoryId,
                cats.map((c) => c.id),
              ),
            ),
          )
      : []);
    const texts = await (items.length
      ? tx
          .select()
          .from(productTranslations)
          .where(
            and(
              eq(productTranslations.restaurantId, tenant),
              inArray(
                productTranslations.productId,
                items.map((p) => p.id),
              ),
            ),
          )
      : []);
    const images = await (items.length
      ? tx
          .select({
            productId: productImages.productId,
            id: mediaAssets.id,
            alt: mediaAssets.alt,
            width: mediaAssets.width,
            height: mediaAssets.height,
          })
          .from(productImages)
          .innerJoin(
            mediaAssets,
            and(
              eq(mediaAssets.restaurantId, productImages.restaurantId),
              eq(mediaAssets.id, productImages.mediaId),
              eq(mediaAssets.state, "READY"),
            ),
          )
          .where(
            and(
              eq(productImages.restaurantId, tenant),
              eq(productImages.menuId, menuId),
              inArray(
                productImages.productId,
                items.map((p) => p.id),
              ),
            ),
          )
          .orderBy(asc(productImages.sortOrder))
      : []);
    const links = await (items.length
      ? tx
          .select()
          .from(productModifierGroups)
          .where(
            and(
              eq(productModifierGroups.restaurantId, tenant),
              eq(productModifierGroups.menuId, menuId),
              inArray(
                productModifierGroups.productId,
                items.map((p) => p.id),
              ),
            ),
          )
      : []);
    const groupIds = [...new Set(links.map((l) => l.groupId))];
    const groups = groupIds.length
      ? await tx
          .select()
          .from(modifierGroups)
          .where(
            and(
              eq(modifierGroups.restaurantId, tenant),
              eq(modifierGroups.menuId, menuId),
              inArray(modifierGroups.id, groupIds),
            ),
          )
          .limit(200)
      : [];
    const options = groups.length
      ? await tx
          .select()
          .from(modifierOptions)
          .where(
            and(
              eq(modifierOptions.restaurantId, tenant),
              inArray(
                modifierOptions.groupId,
                groups.map((g) => g.id),
              ),
            ),
          )
          .orderBy(asc(modifierOptions.createdAt))
      : [];
    const translated = (names: Record<Locale, string>) =>
      names[locale] || names[gate.settings.defaultLocale];
    return menuDataSchema.parse({
      theme: gate.theme,
      contractVersion: 1,
      identity: {
        restaurantId: tenant,
        menuId,
        branchId: gate.branch.id,
        canonicalPath: `/r/${gate.restaurant.slug}/${gate.branch.slug}/${locale}`,
      },
      restaurant: {
        name: gate.restaurant.name,
        description: gate.restaurant.description,
        phone: gate.restaurant.phone,
        address: gate.branch.address || gate.restaurant.address,
      },
      context: {
        branchName: gate.branch.name,
        timezone: gate.branch.timezone,
        orderingEnabled: gate.settings.orderingEnabled,
      },
      locale,
      defaultLocale: gate.settings.defaultLocale,
      enabledLocales: gate.settings.enabledLocales,
      currency: gate.settings.currency,
      contentRevision: gate.menu.catalogRevision,
      categories: cats.map((c) => ({
        id: c.id,
        name: localizedField(
          catTexts.filter((t) => t.categoryId === c.id),
          locale,
          gate.settings.defaultLocale,
          "name",
        ),
        sortOrder: c.sortOrder,
        productIds: items.filter((p) => p.categoryId === c.id).map((p) => p.id),
      })),
      products: items.map((p) => {
        const content = texts.filter((t) => t.productId === p.id);
        return {
          id: p.id,
          categoryId: p.categoryId,
          name: localizedField(
            content,
            locale,
            gate.settings.defaultLocale,
            "name",
          ),
          description: localizedField(
            content,
            locale,
            gate.settings.defaultLocale,
            "description",
          ),
          ingredients: localizedField(
            content,
            locale,
            gate.settings.defaultLocale,
            "ingredients",
          ),
          priceMinor: p.priceMinor.toString(),
          available: p.available,
          featured: p.featured,
          allergens: p.allergens,
          images: images
            .filter((i) => i.productId === p.id)
            .map((i) => ({
              id: i.id,
              url: `/api/media/${i.id}/640`,
              alt: i.alt,
              width: i.width,
              height: i.height,
            })),
          modifierGroupIds: links
            .filter((l) => l.productId === p.id)
            .map((l) => l.groupId),
        };
      }),
      modifierGroups: groups.map((g) => ({
        id: g.id,
        name: translated(g.names),
        minSelections: g.minSelections,
        maxSelections: g.maxSelections,
        options: options
          .filter((o) => o.groupId === g.id)
          .map((o) => ({
            id: o.id,
            name: translated(o.names),
            priceDeltaMinor: o.priceDeltaMinor.toString(),
            available: o.available,
          })),
      })),
    });
  };
  return transaction
    ? run(transaction)
    : db.transaction(run, {
        isolationLevel: "repeatable read",
        accessMode: "read only",
      });
}
export async function getPublicMenu(
  slug: string,
  branch: string,
  language: string,
) {
  const gate = await publicGate(slug, branch);
  if (!isLocale(language) || !gate.settings.enabledLocales.includes(language))
    throw new AppError("NOT_FOUND", 404);
  const data = await unstable_cache(
    () => projectMenu(gate, language),
    [
      "public-menu-v1",
      gate.restaurant.id,
      gate.branch.id,
      gate.menu.id,
      language,
      String(gate.menu.catalogRevision),
      gate.theme.revisionId,
    ],
    { revalidate: 300 },
  )();
  const [system, plan] = await Promise.all([
    systemSettings(),
    entitlement(db, gate.restaurant.id),
  ]);
  return {
    data: {
      ...data,
      context: {
        ...data.context,
        orderingEnabled:
          data.context.orderingEnabled &&
          system.orderingEnabled &&
          plan.limits.ordering,
      },
    },
    gate,
  };
}
