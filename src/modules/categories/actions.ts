"use server";
import { count, and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant, audit } from "@/modules/memberships/server";
import { requireMenu, bumpMenu } from "@/modules/menus/server";
import { restaurantSettings } from "@/modules/restaurants/schema";
import { categorySchema } from "@/modules/products/validation";
import { categories, categoryTranslations } from "./schema";
import { locales } from "@/i18n/config";
import { AppError, failure, type ActionResult } from "@/infrastructure/errors";
export async function saveCategory(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = categorySchema.parse(input);
    await withTenant(restaurantId, "catalog:manage", async (tx, actor) => {
      await requireMenu(tx, actor, data.menuId);
      const [settings] = await tx
        .select()
        .from(restaurantSettings)
        .where(eq(restaurantSettings.restaurantId, actor.restaurantId));
      if (!data.names[settings.defaultLocale])
        throw new AppError("INVALID_INPUT");
      if (!data.id) {
        const [usage] = await tx
          .select({ n: count() })
          .from(categories)
          .where(
            and(
              eq(categories.restaurantId, actor.restaurantId),
              eq(categories.menuId, data.menuId),
            ),
          );
        if (usage.n >= 100) throw new AppError("PLAN_LIMIT", 403);
      }
      let id = data.id;
      if (id) {
        const [row] = await tx
          .update(categories)
          .set({
            visible: data.visible,
            sortOrder: data.sortOrder,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(categories.restaurantId, actor.restaurantId),
              eq(categories.menuId, data.menuId),
              eq(categories.id, id),
            ),
          )
          .returning();
        if (!row) throw new AppError("NOT_FOUND", 404);
      } else {
        const [row] = await tx
          .insert(categories)
          .values({
            restaurantId: actor.restaurantId,
            menuId: data.menuId,
            visible: data.visible,
            sortOrder: data.sortOrder,
          })
          .returning();
        id = row.id;
      }
      for (const locale of locales)
        await tx
          .insert(categoryTranslations)
          .values({
            restaurantId: actor.restaurantId,
            categoryId: id,
            locale,
            name: data.names[locale],
          })
          .onConflictDoUpdate({
            target: [
              categoryTranslations.restaurantId,
              categoryTranslations.categoryId,
              categoryTranslations.locale,
            ],
            set: { name: data.names[locale] },
          });
      await bumpMenu(tx, actor.restaurantId, data.menuId);
      await audit(tx, actor, "category.saved", id);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
