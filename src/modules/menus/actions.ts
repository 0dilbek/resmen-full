"use server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withTenant, audit } from "@/modules/memberships/server";
import { requireMenu, bumpMenu } from "./server";
import { menus } from "./schema";
import { restaurants } from "@/modules/restaurants/schema";
import { failure, type ActionResult } from "@/infrastructure/errors";
import { validatePublication } from "./publication";
export async function setPublication(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = z
      .object({ menuId: z.uuid(), published: z.boolean() })
      .strict()
      .parse(input);
    await withTenant(restaurantId, "menu:publish", async (tx, actor) => {
      const menu = await requireMenu(tx, actor, data.menuId);
      if (data.published) {
        await validatePublication(
          tx,
          actor.restaurantId,
          menu.id,
          menu.branchId,
        );
        if (actor.restaurant.status === "DRAFT")
          await tx
            .update(restaurants)
            .set({ status: "ACTIVE", updatedAt: new Date() })
            .where(eq(restaurants.id, actor.restaurantId));
      }
      await tx
        .update(menus)
        .set({ published: data.published })
        .where(
          and(
            eq(menus.restaurantId, actor.restaurantId),
            eq(menus.id, menu.id),
          ),
        );
      await bumpMenu(tx, actor.restaurantId, menu.id);
      await audit(
        tx,
        actor,
        data.published ? "menu.published" : "menu.unpublished",
        menu.id,
      );
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
