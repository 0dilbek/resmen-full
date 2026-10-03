import "server-only";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { requireActor, requireBranch } from "@/modules/memberships/server";
import type { Permission } from "@/modules/memberships/policy";
import { branches } from "@/modules/branches/schema";
import { menus } from "@/modules/menus/schema";
import { memberships } from "@/modules/memberships/schema";
import { restaurants, restaurantSettings } from "./schema";
import { AppError } from "@/infrastructure/errors";
import { z } from "zod";
export async function listRestaurants(userId: string) {
  return db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      slug: restaurants.slug,
      status: restaurants.status,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(restaurants, eq(restaurants.id, memberships.restaurantId))
    .where(and(eq(memberships.userId, userId), eq(memberships.active, true)))
    .orderBy(asc(restaurants.createdAt));
}
export async function workspace(
  restaurantId: string,
  permission: Permission = "restaurant:read",
  branchId?: string,
) {
  if (!z.uuid().safeParse(restaurantId).success) notFound();
  const actor = await requireActor(restaurantId, permission).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 404 || error.status === 403) notFound();
      if (error.status === 401) redirect("/en/login");
    }
    throw error;
  });
  const allowed = await db
    .select()
    .from(branches)
    .where(
      and(
        eq(branches.restaurantId, actor.restaurantId),
        actor.allBranches ? undefined : inArray(branches.id, actor.branchIds),
      ),
    )
    .orderBy(asc(branches.createdAt));
  if (branchId && !z.uuid().safeParse(branchId).success) notFound();
  const branch = branchId
    ? allowed.find((b) => b.id === branchId)
    : allowed.find((b) => b.isDefault) || allowed[0];
  if (!branch) notFound();
  requireBranch(actor, branch.id);
  const [menu] = await db
    .select()
    .from(menus)
    .where(
      and(
        eq(menus.restaurantId, actor.restaurantId),
        eq(menus.branchId, branch.id),
      ),
    );
  if (!menu) notFound();
  const [settings] = await db
    .select()
    .from(restaurantSettings)
    .where(eq(restaurantSettings.restaurantId, actor.restaurantId));
  return {
    actor,
    restaurant: actor.restaurant,
    branches: allowed,
    branch,
    menu,
    settings,
  };
}
