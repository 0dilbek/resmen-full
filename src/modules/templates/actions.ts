"use server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withTenant, audit } from "@/modules/memberships/server";
import { requireMenu, bumpMenu } from "@/modules/menus/server";
import { validatePublication } from "@/modules/menus/publication";
import { restaurants } from "@/modules/restaurants/schema";
import { menus } from "@/modules/menus/schema";
import { AppError, failure, type ActionResult } from "@/infrastructure/errors";
import { themeConfigSchema } from "./config";
import { templateConfigs, templateRevisions } from "./schema";
import { checkThemeMedia, checkTemplate } from "./server";
const versionInput = z
  .object({ menuId: z.uuid(), expectedVersion: z.number().int().min(0) })
  .strict();
export async function saveDraft(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult<{ version: number }>> {
  try {
    const data = versionInput
      .extend({ config: themeConfigSchema })
      .parse(input);
    const version = await withTenant(
      restaurantId,
      "template:manage",
      async (tx, actor) => {
        await requireMenu(tx, actor, data.menuId);
        await checkTemplate(tx, data.config.templateId);
        await checkThemeMedia(tx, actor.restaurantId, data.menuId, data.config);
        const [existing] = await tx
          .select()
          .from(templateConfigs)
          .where(
            and(
              eq(templateConfigs.restaurantId, actor.restaurantId),
              eq(templateConfigs.menuId, data.menuId),
            ),
          );
        if ((existing?.draftVersion ?? 0) !== data.expectedVersion)
          throw new AppError("CONFLICT", 409);
        if (existing)
          await tx
            .update(templateConfigs)
            .set({
              draft: data.config,
              draftVersion: sql`${templateConfigs.draftVersion}+1`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(templateConfigs.restaurantId, actor.restaurantId),
                eq(templateConfigs.menuId, data.menuId),
                eq(templateConfigs.draftVersion, data.expectedVersion),
              ),
            );
        else
          await tx.insert(templateConfigs).values({
            restaurantId: actor.restaurantId,
            menuId: data.menuId,
            draft: data.config,
          });
        await audit(tx, actor, "template.draft_saved", data.menuId);
        return data.expectedVersion + 1;
      },
    );
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true, data: { version } };
  } catch (error) {
    return failure(error);
  }
}
export async function publishDesign(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = versionInput.parse(input);
    await withTenant(restaurantId, "menu:publish", async (tx, actor) => {
      const menu = await requireMenu(tx, actor, data.menuId);
      const [row] = await tx
        .select()
        .from(templateConfigs)
        .where(
          and(
            eq(templateConfigs.restaurantId, actor.restaurantId),
            eq(templateConfigs.menuId, data.menuId),
          ),
        )
        .for("update");
      if (!row || row.draftVersion !== data.expectedVersion)
        throw new AppError("CONFLICT", 409);
      const config = themeConfigSchema.parse(row.draft);
      await checkTemplate(tx, config.templateId);
      await checkThemeMedia(tx, actor.restaurantId, menu.id, config);
      await validatePublication(tx, actor.restaurantId, menu.id, menu.branchId);
      const [revision] = await tx
        .insert(templateRevisions)
        .values({
          restaurantId: actor.restaurantId,
          menuId: menu.id,
          templateId: config.templateId,
          config,
          createdBy: actor.userId,
        })
        .returning();
      await tx
        .update(templateConfigs)
        .set({ publishedRevisionId: revision.id, updatedAt: new Date() })
        .where(
          and(
            eq(templateConfigs.restaurantId, actor.restaurantId),
            eq(templateConfigs.menuId, menu.id),
          ),
        );
      await tx
        .update(menus)
        .set({ published: true })
        .where(
          and(
            eq(menus.restaurantId, actor.restaurantId),
            eq(menus.id, menu.id),
          ),
        );
      if (actor.restaurant.status === "DRAFT")
        await tx
          .update(restaurants)
          .set({ status: "ACTIVE" })
          .where(eq(restaurants.id, actor.restaurantId));
      await bumpMenu(tx, actor.restaurantId, menu.id);
      await audit(tx, actor, "template.published", revision.id);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
export async function restoreDesign(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = versionInput.extend({ revisionId: z.uuid() }).parse(input);
    await withTenant(restaurantId, "template:manage", async (tx, actor) => {
      await requireMenu(tx, actor, data.menuId);
      const [old] = await tx
        .select()
        .from(templateRevisions)
        .where(
          and(
            eq(templateRevisions.restaurantId, actor.restaurantId),
            eq(templateRevisions.menuId, data.menuId),
            eq(templateRevisions.id, data.revisionId),
          ),
        );
      if (!old) throw new AppError("NOT_FOUND", 404);
      const config = themeConfigSchema.parse(old.config);
      await checkTemplate(tx, config.templateId);
      await checkThemeMedia(tx, actor.restaurantId, data.menuId, config);
      const [saved] = await tx
        .update(templateConfigs)
        .set({
          draft: config,
          draftVersion: sql`${templateConfigs.draftVersion}+1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(templateConfigs.restaurantId, actor.restaurantId),
            eq(templateConfigs.menuId, data.menuId),
            eq(templateConfigs.draftVersion, data.expectedVersion),
          ),
        )
        .returning();
      if (!saved) throw new AppError("CONFLICT", 409);
      await audit(tx, actor, "template.restored_to_draft", old.id);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
