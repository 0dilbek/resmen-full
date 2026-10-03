"use server";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/infrastructure/http/security";
import { db } from "@/infrastructure/db";
import { getSession } from "@/modules/auth/server";
import { branches, branchSlugs } from "@/modules/branches/schema";
import { menus } from "@/modules/menus/schema";
import { memberships, auditLogs } from "@/modules/memberships/schema";
import { restaurants, restaurantSettings, restaurantSlugs } from "./schema";
import { createRestaurantSchema, profileSchema } from "./validation";
import { AppError, failure, type ActionResult } from "@/infrastructure/errors";
import { withTenant, audit } from "@/modules/memberships/server";
export async function createRestaurant(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session?.user.emailVerified)
      throw new AppError("UNAUTHENTICATED", 401);
    const data = createRestaurantSchema.parse(input);
    await rateLimit(`restaurant-create:${session.user.id}`, 10, 3600);
    const result = await db.transaction(async (tx) => {
      // Serialize creation per owner; retrying an identical slug is idempotent for its owner.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${session.user.id}))`,
      );
      const [existing] = await tx
        .select({ id: restaurants.id })
        .from(restaurants)
        .innerJoin(
          memberships,
          and(
            eq(memberships.restaurantId, restaurants.id),
            eq(memberships.userId, session.user.id),
            eq(memberships.role, "OWNER"),
            eq(memberships.active, true),
          ),
        )
        .where(eq(restaurants.slug, data.slug));
      if (existing) return existing;
      const owned = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, session.user.id),
            eq(memberships.role, "OWNER"),
            eq(memberships.active, true),
          ),
        );
      if (owned.length >= 10) throw new AppError("FORBIDDEN", 403);
      const [restaurant] = await tx
        .insert(restaurants)
        .values(data)
        .returning();
      await tx
        .insert(restaurantSlugs)
        .values({ slug: data.slug, restaurantId: restaurant.id });
      await tx
        .insert(restaurantSettings)
        .values({ restaurantId: restaurant.id });
      await tx.insert(memberships).values({
        restaurantId: restaurant.id,
        userId: session.user.id,
        role: "OWNER",
        allBranches: true,
      });
      const [branch] = await tx
        .insert(branches)
        .values({
          restaurantId: restaurant.id,
          name: data.name,
          slug: "main",
          isDefault: true,
        })
        .returning();
      await tx.insert(branchSlugs).values({
        restaurantId: restaurant.id,
        branchId: branch.id,
        slug: "main",
      });
      await tx
        .insert(menus)
        .values({ restaurantId: restaurant.id, branchId: branch.id });
      await tx.insert(auditLogs).values({
        restaurantId: restaurant.id,
        actorId: session.user.id,
        scope: "restaurant",
        action: "restaurant.created",
        resourceId: restaurant.id,
      });
      return { id: restaurant.id };
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}
export async function updateProfile(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = profileSchema.parse(input);
    await withTenant(restaurantId, "restaurant:update", async (tx, actor) => {
      await tx
        .update(restaurants)
        .set({
          name: data.name,
          description: data.description,
          phone: data.phone,
          address: data.address,
          updatedAt: new Date(),
        })
        .where(eq(restaurants.id, actor.restaurantId));
      await tx
        .update(restaurantSettings)
        .set({
          defaultLocale: data.defaultLocale,
          enabledLocales: data.enabledLocales,
          orderingEnabled: data.orderingEnabled,
        })
        .where(eq(restaurantSettings.restaurantId, actor.restaurantId));
      await tx
        .update(menus)
        .set({ catalogRevision: sql`${menus.catalogRevision}+1` })
        .where(eq(menus.restaurantId, actor.restaurantId));
      await audit(tx, actor, "restaurant.updated", actor.restaurantId);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
