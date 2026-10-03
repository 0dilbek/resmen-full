"use server";
import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withTenant, requireBranch, audit } from "@/modules/memberships/server";
import { branches } from "@/modules/branches/schema";
import { AppError, failure, type ActionResult } from "@/infrastructure/errors";
import { diningTables, qrCodes } from "./schema";
export async function createTable(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = z
      .object({ branchId: z.uuid(), label: z.string().trim().min(1).max(40) })
      .strict()
      .parse(input);
    await withTenant(restaurantId, "qr:manage", async (tx, actor) => {
      requireBranch(actor, data.branchId);
      const [branch] = await tx
        .select()
        .from(branches)
        .where(
          and(
            eq(branches.restaurantId, actor.restaurantId),
            eq(branches.id, data.branchId),
            eq(branches.active, true),
          ),
        );
      if (!branch) throw new AppError("NOT_FOUND", 404);
      const [count] = await tx
        .select({ value: sql<number>`count(*)::int` })
        .from(diningTables)
        .where(eq(diningTables.restaurantId, actor.restaurantId));
      if (count.value >= 1000) throw new AppError("FORBIDDEN", 403);
      const [table] = await tx
        .insert(diningTables)
        .values({ ...data, restaurantId: actor.restaurantId })
        .returning();
      await tx.insert(qrCodes).values({
        restaurantId: actor.restaurantId,
        branchId: branch.id,
        tableId: table.id,
        kind: "TABLE",
        label: data.label,
        token: randomBytes(24).toString("base64url"),
      });
      await audit(tx, actor, "table.created", table.id);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
export async function createQr(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = z
      .object({
        kind: z.enum(["RESTAURANT", "BRANCH"]),
        branchId: z.uuid(),
        label: z.string().trim().min(1).max(80),
      })
      .strict()
      .parse(input);
    await withTenant(restaurantId, "qr:manage", async (tx, actor) => {
      if (data.kind === "RESTAURANT" && !actor.allBranches)
        throw new AppError("FORBIDDEN", 403);
      requireBranch(actor, data.branchId);
      const [branch] = await tx
        .select()
        .from(branches)
        .where(
          and(
            eq(branches.restaurantId, actor.restaurantId),
            eq(branches.id, data.branchId),
            eq(branches.active, true),
          ),
        );
      if (!branch) throw new AppError("NOT_FOUND", 404);
      const [count] = await tx
        .select({ value: sql<number>`count(*)::int` })
        .from(qrCodes)
        .where(eq(qrCodes.restaurantId, actor.restaurantId));
      if (count.value >= 2000) throw new AppError("FORBIDDEN", 403);
      const [code] = await tx
        .insert(qrCodes)
        .values({
          restaurantId: actor.restaurantId,
          branchId: data.kind === "BRANCH" ? data.branchId : null,
          kind: data.kind,
          label: data.label,
          token: randomBytes(24).toString("base64url"),
        })
        .returning();
      await audit(tx, actor, "qr.created", code.id);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
export async function setQrActive(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = z
      .object({ id: z.uuid(), active: z.boolean() })
      .strict()
      .parse(input);
    await withTenant(restaurantId, "qr:manage", async (tx, actor) => {
      const [code] = await tx
        .select()
        .from(qrCodes)
        .where(
          and(
            eq(qrCodes.restaurantId, actor.restaurantId),
            eq(qrCodes.id, data.id),
          ),
        );
      if (!code || (!code.branchId && !actor.allBranches))
        throw new AppError("NOT_FOUND", 404);
      if (code.branchId) requireBranch(actor, code.branchId);
      await tx
        .update(qrCodes)
        .set({ active: data.active, updatedAt: new Date() })
        .where(
          and(
            eq(qrCodes.restaurantId, actor.restaurantId),
            eq(qrCodes.id, code.id),
          ),
        );
      await audit(
        tx,
        actor,
        data.active ? "qr.activated" : "qr.revoked",
        code.id,
      );
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
export async function setTableActive(
  restaurantId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const data = z
      .object({ id: z.uuid(), active: z.boolean() })
      .strict()
      .parse(input);
    await withTenant(restaurantId, "qr:manage", async (tx, actor) => {
      const [table] = await tx
        .select()
        .from(diningTables)
        .where(
          and(
            eq(diningTables.restaurantId, actor.restaurantId),
            eq(diningTables.id, data.id),
          ),
        );
      if (!table) throw new AppError("NOT_FOUND", 404);
      requireBranch(actor, table.branchId);
      await tx
        .update(diningTables)
        .set({ active: data.active, updatedAt: new Date() })
        .where(
          and(
            eq(diningTables.restaurantId, actor.restaurantId),
            eq(diningTables.id, table.id),
          ),
        );
      await audit(tx, actor, "table.status", table.id);
    });
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
