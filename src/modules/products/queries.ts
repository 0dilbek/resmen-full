import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { requireActor } from "@/modules/memberships/server";
import { requireMenu } from "@/modules/menus/server";
import { categories, categoryTranslations } from "@/modules/categories/schema";
import {
  modifierGroups,
  modifierOptions,
  productModifierGroups,
} from "@/modules/modifiers/schema";
import { products, productTranslations, productImages } from "./schema";
export async function catalog(restaurantId: string, menuId: string) {
  const actor = await requireActor(restaurantId, "catalog:read");
  await requireMenu(db, actor, menuId);
  const [cats, items, groups] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.restaurantId, actor.restaurantId),
          eq(categories.menuId, menuId),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.id)),
    db
      .select()
      .from(products)
      .where(
        and(
          eq(products.restaurantId, actor.restaurantId),
          eq(products.menuId, menuId),
          eq(products.archived, false),
        ),
      )
      .orderBy(asc(products.sortOrder), asc(products.id)),
    db
      .select()
      .from(modifierGroups)
      .where(
        and(
          eq(modifierGroups.restaurantId, actor.restaurantId),
          eq(modifierGroups.menuId, menuId),
        ),
      ),
  ]);
  const [catText, itemText, images, options, links] = await Promise.all([
    cats.length
      ? db
          .select()
          .from(categoryTranslations)
          .where(
            and(
              eq(categoryTranslations.restaurantId, actor.restaurantId),
              inArray(
                categoryTranslations.categoryId,
                cats.map((c) => c.id),
              ),
            ),
          )
      : [],
    items.length
      ? db
          .select()
          .from(productTranslations)
          .where(
            and(
              eq(productTranslations.restaurantId, actor.restaurantId),
              inArray(
                productTranslations.productId,
                items.map((p) => p.id),
              ),
            ),
          )
      : [],
    items.length
      ? db
          .select()
          .from(productImages)
          .where(
            and(
              eq(productImages.restaurantId, actor.restaurantId),
              eq(productImages.menuId, menuId),
            ),
          )
          .orderBy(asc(productImages.sortOrder))
      : [],
    groups.length
      ? db
          .select()
          .from(modifierOptions)
          .where(
            and(
              eq(modifierOptions.restaurantId, actor.restaurantId),
              inArray(
                modifierOptions.groupId,
                groups.map((g) => g.id),
              ),
            ),
          )
      : [],
    db
      .select()
      .from(productModifierGroups)
      .where(
        and(
          eq(productModifierGroups.restaurantId, actor.restaurantId),
          eq(productModifierGroups.menuId, menuId),
        ),
      ),
  ]);
  return {
    categories: cats.map((c) => ({
      ...c,
      names: {
        uz:
          catText.find((t) => t.categoryId === c.id && t.locale === "uz")
            ?.name ?? "",
        ru:
          catText.find((t) => t.categoryId === c.id && t.locale === "ru")
            ?.name ?? "",
        en:
          catText.find((t) => t.categoryId === c.id && t.locale === "en")
            ?.name ?? "",
      },
    })),
    products: items.map((p) => ({
      ...p,
      priceMinor: p.priceMinor.toString(),
      translations: itemText.filter((t) => t.productId === p.id),
      mediaIds: images
        .filter((i) => i.productId === p.id)
        .map((i) => i.mediaId),
      modifierGroupIds: links
        .filter((l) => l.productId === p.id)
        .map((l) => l.groupId),
    })),
    groups: groups.map((g) => ({
      ...g,
      options: options
        .filter((o) => o.groupId === g.id)
        .map((o) => ({ ...o, priceDeltaMinor: o.priceDeltaMinor.toString() })),
    })),
  };
}
