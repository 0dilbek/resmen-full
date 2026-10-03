import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, type Transaction } from "@/infrastructure/db";
import { menus } from "./schema";
import { requireBranch, type Actor } from "@/modules/memberships/server";
import { AppError } from "@/infrastructure/errors";
export async function requireMenu(
  database: typeof db | Transaction,
  actor: Actor,
  menuId: string,
) {
  const [menu] = await database
    .select()
    .from(menus)
    .where(
      and(eq(menus.restaurantId, actor.restaurantId), eq(menus.id, menuId)),
    );
  if (!menu) throw new AppError("NOT_FOUND", 404);
  requireBranch(actor, menu.branchId);
  return menu;
}
export async function bumpMenu(
  tx: Transaction,
  restaurantId: string,
  menuId: string,
) {
  await tx
    .update(menus)
    .set({
      catalogRevision: sql`${menus.catalogRevision}+1`,
      updatedAt: new Date(),
    })
    .where(and(eq(menus.restaurantId, restaurantId), eq(menus.id, menuId)));
}
