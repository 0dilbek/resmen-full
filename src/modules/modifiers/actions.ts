"use server";
import { count, and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant, audit } from "@/modules/memberships/server";
import { requireMenu, bumpMenu } from "@/modules/menus/server";
import { restaurantSettings } from "@/modules/restaurants/schema";
import { modifierSchema } from "@/modules/products/validation";
import { parseMoney } from "@/modules/products/money";
import { modifierGroups, modifierOptions } from "./schema";
import { AppError, failure, type ActionResult } from "@/infrastructure/errors";
export async function saveModifier(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = modifierSchema.parse(input);
    await withTenant(restaurantId, "catalog:manage", async (tx, actor) => {
      await requireMenu(tx, actor, data.menuId);
      const [settings] = await tx
        .select()
        .from(restaurantSettings)
        .where(eq(restaurantSettings.restaurantId, actor.restaurantId));
      if (
        !data.names[settings.defaultLocale] ||
        data.options.some((o) => !o.names[settings.defaultLocale])
      )
        throw new AppError("INVALID_INPUT");
      if (!data.id) {
        const [usage] = await tx
          .select({ n: count() })
          .from(modifierGroups)
          .where(
            and(
              eq(modifierGroups.restaurantId, actor.restaurantId),
              eq(modifierGroups.menuId, data.menuId),
            ),
          );
        if (usage.n >= 200) throw new AppError("PLAN_LIMIT", 403);
      }
      let id = data.id;
      const values = {
        names: data.names,
        minSelections: data.minSelections,
        maxSelections: data.maxSelections,
        updatedAt: new Date(),
      };
      if (id) {
        const [row] = await tx
          .update(modifierGroups)
          .set(values)
          .where(
            and(
              eq(modifierGroups.restaurantId, actor.restaurantId),
              eq(modifierGroups.menuId, data.menuId),
              eq(modifierGroups.id, id),
            ),
          )
          .returning();
        if (!row) throw new AppError("NOT_FOUND", 404);
      } else {
        const [row] = await tx
          .insert(modifierGroups)
          .values({
            ...values,
            restaurantId: actor.restaurantId,
            menuId: data.menuId,
          })
          .returning();
        id = row.id;
      }
      const existing = await tx
        .select()
        .from(modifierOptions)
        .where(
          and(
            eq(modifierOptions.restaurantId, actor.restaurantId),
            eq(modifierOptions.groupId, id),
          ),
        );
      for (const option of data.options) {
        const values = {
          names: option.names,
          priceDeltaMinor: parseMoney(option.price),
          available: option.available,
          updatedAt: new Date(),
        };
        if (option.id) {
          if (!existing.some((o) => o.id === option.id))
            throw new AppError("NOT_FOUND", 404);
          await tx
            .update(modifierOptions)
            .set(values)
            .where(
              and(
                eq(modifierOptions.restaurantId, actor.restaurantId),
                eq(modifierOptions.groupId, id),
                eq(modifierOptions.id, option.id),
              ),
            );
        } else
          await tx.insert(modifierOptions).values({
            ...values,
            restaurantId: actor.restaurantId,
            groupId: id,
          });
      }
      const removed = existing
        .filter((o) => !data.options.some((v) => v.id === o.id))
        .map((o) => o.id);
      if (removed.length)
        await tx
          .update(modifierOptions)
          .set({ available: false })
          .where(
            and(
              eq(modifierOptions.restaurantId, actor.restaurantId),
              eq(modifierOptions.groupId, id),
              inArray(modifierOptions.id, removed),
            ),
          );
      await bumpMenu(tx, actor.restaurantId, data.menuId);
      await audit(tx, actor, "modifier.saved", id);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
