"use server";
import { and, eq, inArray, sql, count } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withTenant, audit } from "@/modules/memberships/server";
import { requireMenu, bumpMenu } from "@/modules/menus/server";
import { restaurantSettings } from "@/modules/restaurants/schema";
import { categories } from "@/modules/categories/schema";
import {
  modifierGroups,
  productModifierGroups,
} from "@/modules/modifiers/schema";
import { productSchema } from "./validation";
import {
  products,
  productTranslations,
  productImages,
  mediaAssets,
} from "./schema";
import { checkQuota } from "@/modules/billing/server";
import { parseMoney } from "./money";
import { locales } from "@/i18n/config";
import { AppError, failure, type ActionResult } from "@/infrastructure/errors";
export async function saveProduct(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = productSchema.parse(input);
    const result = await withTenant(
      restaurantId,
      "catalog:manage",
      async (tx, actor) => {
        await requireMenu(tx, actor, data.menuId);
        if (!data.id) {
          await checkQuota(tx, actor.restaurantId, "products");
          const [usage] = await tx
            .select({ n: count() })
            .from(products)
            .where(
              and(
                eq(products.restaurantId, actor.restaurantId),
                eq(products.menuId, data.menuId),
                eq(products.archived, false),
              ),
            );
          if (usage.n >= 1000) throw new AppError("PLAN_LIMIT", 403);
        }
        const [settings] = await tx
          .select()
          .from(restaurantSettings)
          .where(eq(restaurantSettings.restaurantId, actor.restaurantId));
        if (!data.translations[settings.defaultLocale].name)
          throw new AppError("INVALID_INPUT");
        const [category] = await tx
          .select()
          .from(categories)
          .where(
            and(
              eq(categories.restaurantId, actor.restaurantId),
              eq(categories.menuId, data.menuId),
              eq(categories.id, data.categoryId),
            ),
          );
        if (!category) throw new AppError("NOT_FOUND", 404);
        if (data.mediaIds.length) {
          const images = await tx
            .select()
            .from(mediaAssets)
            .where(
              and(
                eq(mediaAssets.restaurantId, actor.restaurantId),
                eq(mediaAssets.menuId, data.menuId),
                eq(mediaAssets.state, "READY"),
                inArray(mediaAssets.id, data.mediaIds),
              ),
            );
          if (images.length !== new Set(data.mediaIds).size)
            throw new AppError("NOT_FOUND", 404);
        }
        if (data.modifierGroupIds.length) {
          const groups = await tx
            .select()
            .from(modifierGroups)
            .where(
              and(
                eq(modifierGroups.restaurantId, actor.restaurantId),
                eq(modifierGroups.menuId, data.menuId),
                inArray(modifierGroups.id, data.modifierGroupIds),
              ),
            );
          if (groups.length !== new Set(data.modifierGroupIds).size)
            throw new AppError("NOT_FOUND", 404);
        }
        const values = {
          categoryId: data.categoryId,
          priceMinor: parseMoney(data.price),
          currency: settings.currency,
          available: data.available,
          published: data.published,
          featured: data.featured,
          sortOrder: data.sortOrder,
          allergens: [...new Set(data.allergens)],
          updatedAt: new Date(),
        };
        let id = data.id;
        if (id) {
          if (!data.version) throw new AppError("INVALID_INPUT");
          const [row] = await tx
            .update(products)
            .set({ ...values, version: sql`${products.version}+1` })
            .where(
              and(
                eq(products.restaurantId, actor.restaurantId),
                eq(products.menuId, data.menuId),
                eq(products.id, id),
                eq(products.version, data.version),
                eq(products.archived, false),
              ),
            )
            .returning();
          if (!row) throw new AppError("CONFLICT", 409);
        } else {
          const [row] = await tx
            .insert(products)
            .values({
              ...values,
              restaurantId: actor.restaurantId,
              menuId: data.menuId,
            })
            .returning();
          id = row.id;
        }
        for (const locale of locales)
          await tx
            .insert(productTranslations)
            .values({
              restaurantId: actor.restaurantId,
              productId: id,
              locale,
              ...data.translations[locale],
            })
            .onConflictDoUpdate({
              target: [
                productTranslations.restaurantId,
                productTranslations.productId,
                productTranslations.locale,
              ],
              set: data.translations[locale],
            });
        await tx
          .delete(productImages)
          .where(
            and(
              eq(productImages.restaurantId, actor.restaurantId),
              eq(productImages.productId, id),
            ),
          );
        if (data.mediaIds.length)
          await tx.insert(productImages).values(
            [...new Set(data.mediaIds)].map((mediaId, sortOrder) => ({
              restaurantId: actor.restaurantId,
              menuId: data.menuId,
              productId: id!,
              mediaId,
              sortOrder,
            })),
          );
        await tx
          .delete(productModifierGroups)
          .where(
            and(
              eq(productModifierGroups.restaurantId, actor.restaurantId),
              eq(productModifierGroups.productId, id),
            ),
          );
        if (data.modifierGroupIds.length)
          await tx.insert(productModifierGroups).values(
            [...new Set(data.modifierGroupIds)].map((groupId) => ({
              restaurantId: actor.restaurantId,
              menuId: data.menuId,
              productId: id!,
              groupId,
            })),
          );
        await bumpMenu(tx, actor.restaurantId, data.menuId);
        await audit(tx, actor, "product.saved", id);
        return { id };
      },
    );
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}
export async function changeProductState(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = z
      .object({
        id: z.uuid(),
        menuId: z.uuid(),
        version: z.number().int(),
        available: z.boolean().optional(),
        archived: z.boolean().optional(),
      })
      .strict()
      .parse(input);
    await withTenant(restaurantId, "catalog:manage", async (tx, actor) => {
      await requireMenu(tx, actor, data.menuId);
      const [current] = await tx
        .select({ archived: products.archived })
        .from(products)
        .where(
          and(
            eq(products.restaurantId, actor.restaurantId),
            eq(products.menuId, data.menuId),
            eq(products.id, data.id),
          ),
        );
      if (!current) throw new AppError("NOT_FOUND", 404);
      if (data.archived === false && current.archived) {
        await checkQuota(tx, actor.restaurantId, "products");
        const [usage] = await tx
          .select({ n: count() })
          .from(products)
          .where(
            and(
              eq(products.restaurantId, actor.restaurantId),
              eq(products.menuId, data.menuId),
              eq(products.archived, false),
            ),
          );
        if (usage.n >= 1000) throw new AppError("PLAN_LIMIT", 403);
      }
      const [changed] = await tx
        .update(products)
        .set({
          available: data.available,
          archived: data.archived,
          version: sql`${products.version}+1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.restaurantId, actor.restaurantId),
            eq(products.menuId, data.menuId),
            eq(products.id, data.id),
            eq(products.version, data.version),
          ),
        )
        .returning();
      if (!changed) throw new AppError("CONFLICT", 409);
      await bumpMenu(tx, actor.restaurantId, data.menuId);
      await audit(tx, actor, "product.state", data.id);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
