"use server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withTenant, audit } from "@/modules/memberships/server";
import { failure, type ActionResult, AppError } from "@/infrastructure/errors";
import { checkQuota } from "@/modules/billing/server";
import { branches, branchSlugs } from "./schema";
import { menus } from "@/modules/menus/schema";
import { slugSchema } from "@/modules/restaurants/validation";
const schema = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: slugSchema,
    address: z.string().max(250),
  })
  .strict();
export async function createBranch(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = schema.parse(input);
    await withTenant(restaurantId, "branch:manage", async (tx, actor) => {
      await checkQuota(tx, actor.restaurantId, "branches");
      const [branch] = await tx
        .insert(branches)
        .values({ ...data, restaurantId: actor.restaurantId })
        .returning();
      await tx.insert(branchSlugs).values({
        restaurantId: actor.restaurantId,
        branchId: branch.id,
        slug: data.slug,
      });
      await tx
        .insert(menus)
        .values({ restaurantId: actor.restaurantId, branchId: branch.id });
      await audit(tx, actor, "branch.created", branch.id);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
export async function setBranchActive(
  restaurantId: string,
  branchId: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    z.uuid().parse(branchId);
    z.boolean().parse(active);
    await withTenant(restaurantId, "branch:manage", async (tx, actor) => {
      const [branch] = await tx
        .select()
        .from(branches)
        .where(
          and(
            eq(branches.restaurantId, actor.restaurantId),
            eq(branches.id, branchId),
          ),
        );
      if (!branch) throw new AppError("NOT_FOUND", 404);
      if (active && !branch.active)
        await checkQuota(tx, actor.restaurantId, "branches");
      if (branch.isDefault && !active) throw new AppError("FORBIDDEN", 403);
      await tx
        .update(branches)
        .set({ active, updatedAt: new Date() })
        .where(
          and(
            eq(branches.restaurantId, actor.restaurantId),
            eq(branches.id, branchId),
          ),
        );
      await audit(tx, actor, "branch.status", branchId);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
