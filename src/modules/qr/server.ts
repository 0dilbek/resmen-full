import "server-only";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import QRCode from "qrcode";
import { db, type Transaction } from "@/infrastructure/db";
import { env } from "@/infrastructure/env";
import { AppError } from "@/infrastructure/errors";
import { restaurants, restaurantSettings } from "@/modules/restaurants/schema";
import { branches } from "@/modules/branches/schema";
import { menus } from "@/modules/menus/schema";
import { requireActor, requireBranch } from "@/modules/memberships/server";
import { qrCodes, diningTables } from "./schema";
export const qrTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/);
export async function resolveQr(
  token: string,
  reader: typeof db | Transaction = db,
) {
  if (!qrTokenSchema.safeParse(token).success)
    throw new AppError("NOT_FOUND", 404);
  const [code] = await reader
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.token, token), eq(qrCodes.active, true)));
  if (!code) throw new AppError("NOT_FOUND", 404);
  const [tenant] = await reader
    .select({ restaurant: restaurants, settings: restaurantSettings })
    .from(restaurants)
    .innerJoin(
      restaurantSettings,
      eq(restaurantSettings.restaurantId, restaurants.id),
    )
    .where(
      and(
        eq(restaurants.id, code.restaurantId),
        eq(restaurants.status, "ACTIVE"),
      ),
    );
  if (!tenant) throw new AppError("NOT_FOUND", 404);
  const [row] = await reader
    .select({ branch: branches, menu: menus })
    .from(branches)
    .innerJoin(
      menus,
      and(
        eq(menus.restaurantId, branches.restaurantId),
        eq(menus.branchId, branches.id),
      ),
    )
    .where(
      and(
        eq(branches.restaurantId, code.restaurantId),
        code.branchId
          ? eq(branches.id, code.branchId)
          : eq(branches.isDefault, true),
        eq(branches.active, true),
        eq(menus.published, true),
      ),
    )
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", 404);
  const [table] = code.tableId
    ? await reader
        .select()
        .from(diningTables)
        .where(
          and(
            eq(diningTables.restaurantId, code.restaurantId),
            eq(diningTables.branchId, row.branch.id),
            eq(diningTables.id, code.tableId),
            eq(diningTables.active, true),
          ),
        )
    : [];
  if (code.tableId && !table) throw new AppError("NOT_FOUND", 404);
  return { code, ...tenant, ...row, table: table ?? null };
}
export async function qrWorkspace(
  tenant: string,
  branchId: string,
  page = 1,
  pageSize = 24,
) {
  const actor = await requireActor(tenant, "qr:manage");
  requireBranch(actor, branchId);
  z.number().int().min(1).max(10000).parse(page);
  z.number().int().min(1).max(50).parse(pageSize);
  const tables = await db
    .select()
    .from(diningTables)
    .where(
      and(
        eq(diningTables.restaurantId, actor.restaurantId),
        eq(diningTables.branchId, branchId),
      ),
    )
    .orderBy(asc(diningTables.label));
  const condition = and(
    eq(qrCodes.restaurantId, actor.restaurantId),
    actor.allBranches
      ? or(eq(qrCodes.branchId, branchId), eq(qrCodes.kind, "RESTAURANT"))
      : eq(qrCodes.branchId, branchId),
  );
  const [count] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(qrCodes)
    .where(condition);
  const codes = await db
    .select()
    .from(qrCodes)
    .where(condition)
    .orderBy(asc(qrCodes.createdAt), asc(qrCodes.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { tables, codes, totalPages: Math.ceil(count.value / pageSize) };
}
export async function authorizedCode(tenant: string, codeId: string) {
  const actor = await requireActor(tenant, "qr:manage");
  z.uuid().parse(codeId);
  const [code] = await db
    .select()
    .from(qrCodes)
    .where(
      and(eq(qrCodes.restaurantId, actor.restaurantId), eq(qrCodes.id, codeId)),
    );
  if (!code || (!code.branchId && !actor.allBranches))
    throw new AppError("NOT_FOUND", 404);
  if (code.branchId) requireBranch(actor, code.branchId);
  return { actor, code };
}
export function qrUrl(token: string) {
  return new URL(`/q/${qrTokenSchema.parse(token)}`, env().APP_URL).toString();
}
export async function qrImage(token: string, format: "png" | "svg") {
  const text = qrUrl(token);
  const options = {
    errorCorrectionLevel: "M" as const,
    margin: 4,
    width: 768,
    color: { dark: "#000000", light: "#ffffff" },
  };
  return format === "svg"
    ? QRCode.toString(text, { ...options, type: "svg" })
    : QRCode.toBuffer(text, { ...options, type: "png" });
}
export async function qrDataUrl(token: string) {
  return QRCode.toDataURL(qrUrl(token), {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 320,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
