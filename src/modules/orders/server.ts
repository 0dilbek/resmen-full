import "server-only";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type Transaction } from "@/infrastructure/db";
import { AppError } from "@/infrastructure/errors";
import { systemSettings } from "@/modules/platform-admin/settings";
import { entitlement } from "@/modules/billing/server";
import { restaurants } from "@/modules/restaurants/schema";
import { qrCodes } from "@/modules/qr/schema";
import { resolveQr } from "@/modules/qr/server";
import { projectMenu } from "@/modules/menus/public";
import { defaultTheme } from "@/modules/templates/config";
import {
  withTenant,
  requireActor,
  requireBranch,
  audit,
} from "@/modules/memberships/server";
import {
  orders,
  orderItems,
  orderItemModifiers,
  orderEvents,
  orderCounters,
} from "./schema";
import {
  createOrderSchema,
  transitionSchema,
  allowedTransition,
  capabilitySchema,
  orderStatuses,
  orderDtoSchema,
  boardInputSchema,
  boardDtoSchema,
  type OrderStatus,
} from "./validation";
import { quoteOrder } from "./pricing";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function createOrder(input: unknown) {
  const data = createOrderSchema.parse(input);
  const guestHash = hash(data.credential);
  const requestHash = hash(
    JSON.stringify({
      qr: data.qrToken,
      locale: data.locale,
      notes: data.notes,
      lines: data.lines.map((l) => ({
        ...l,
        optionIds: [...l.optionIds].sort(),
      })),
    }),
  );
  const [origin] = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.token, data.qrToken));
  if (origin) {
    const [replay] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, origin.restaurantId),
          eq(orders.qrId, origin.id),
          eq(orders.idempotencyKey, data.idempotencyKey),
        ),
      );
    if (replay) {
      if (replay.guestHash !== guestHash || replay.requestHash !== requestHash)
        throw new AppError("CONFLICT", 409);
      return { id: replay.id, number: replay.number };
    }
  }
  const initial = await resolveQr(data.qrToken);
  return db.transaction(async (tx) => {
    await tx
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.id, initial.restaurant.id))
      .for("share");
    const q = await resolveQr(data.qrToken, tx);
    if (q.code.kind !== "TABLE" || !q.table || !q.settings.orderingEnabled)
      throw new AppError("UNAVAILABLE", 409);
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`${q.restaurant.id}:${q.branch.id}:${data.idempotencyKey}`}))`,
    );
    const [existing] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, q.restaurant.id),
          eq(orders.branchId, q.branch.id),
          eq(orders.idempotencyKey, data.idempotencyKey),
        ),
      );
    if (existing) {
      if (
        existing.guestHash !== guestHash ||
        existing.requestHash !== requestHash
      )
        throw new AppError("CONFLICT", 409);
      return { id: existing.id, number: existing.number };
    }
    if (!q.settings.enabledLocales.includes(data.locale))
      throw new AppError("INVALID_INPUT");
    const menu = await projectMenu(
      { ...q, theme: { config: defaultTheme(), revisionId: "checkout" } },
      data.locale,
      false,
      tx,
    );
    const settings = await systemSettings(tx);
    const plan = await entitlement(tx, q.restaurant.id);
    if (!settings.orderingEnabled || !plan.limits.ordering)
      throw new AppError("UNAVAILABLE", 409);
    const quote = quoteOrder(menu, data.lines);
    const [counter] = await tx
      .insert(orderCounters)
      .values({
        restaurantId: q.restaurant.id,
        branchId: q.branch.id,
        lastNumber: 1,
      })
      .onConflictDoUpdate({
        target: [orderCounters.restaurantId, orderCounters.branchId],
        set: { lastNumber: sql`${orderCounters.lastNumber}+1` },
      })
      .returning();
    const [order] = await tx
      .insert(orders)
      .values({
        restaurantId: q.restaurant.id,
        branchId: q.branch.id,
        menuId: q.menu.id,
        tableId: q.table.id,
        qrId: q.code.id,
        number: counter.lastNumber,
        tableLabel: q.table.label,
        idempotencyKey: data.idempotencyKey,
        requestHash,
        guestHash,
        locale: data.locale,
        totalMinor: quote.total,
        currency: q.settings.currency,
        notes: data.notes,
      })
      .returning();
    for (const [position, line] of quote.items.entries()) {
      const { modifiers, ...snapshot } = line;
      const [item] = await tx
        .insert(orderItems)
        .values({
          ...snapshot,
          restaurantId: q.restaurant.id,
          menuId: q.menu.id,
          orderId: order.id,
          position,
        })
        .returning();
      if (modifiers.length)
        await tx.insert(orderItemModifiers).values(
          modifiers.map((modifier) => ({
            ...modifier,
            restaurantId: q.restaurant.id,
            itemId: item.id,
          })),
        );
    }
    await tx.insert(orderEvents).values({
      restaurantId: q.restaurant.id,
      orderId: order.id,
      version: 1,
      requestId: data.idempotencyKey,
      status: "NEW",
    });
    return { id: order.id, number: order.number };
  });
}
async function orderDtos(
  reader: typeof db | Transaction,
  tenant: string,
  rows: (typeof orders.$inferSelect)[],
) {
  if (!rows.length) return [];
  const ids = rows.map((o) => o.id);
  const items = await reader
    .select()
    .from(orderItems)
    .where(
      and(
        eq(orderItems.restaurantId, tenant),
        inArray(orderItems.orderId, ids),
      ),
    )
    .orderBy(asc(orderItems.position));
  const modifiers = items.length
    ? await reader
        .select()
        .from(orderItemModifiers)
        .where(
          and(
            eq(orderItemModifiers.restaurantId, tenant),
            inArray(
              orderItemModifiers.itemId,
              items.map((i) => i.id),
            ),
          ),
        )
    : [];
  const events = await reader
    .select()
    .from(orderEvents)
    .where(
      and(
        eq(orderEvents.restaurantId, tenant),
        inArray(orderEvents.orderId, ids),
      ),
    )
    .orderBy(asc(orderEvents.version));
  return rows.map((row) =>
    orderDtoSchema.parse({
      id: row.id,
      number: row.number,
      tableLabel: row.tableLabel,
      status: row.status,
      version: row.version,
      totalMinor: row.totalMinor.toString(),
      currency: row.currency,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lines: items
        .filter((i) => i.orderId === row.id)
        .map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unitMinor: i.unitMinor.toString(),
          totalMinor: i.totalMinor.toString(),
          note: i.note,
          modifiers: modifiers
            .filter((m) => m.itemId === i.id)
            .map((m) => ({
              name: m.name,
              groupName: m.groupName,
              priceDeltaMinor: m.priceDeltaMinor.toString(),
            })),
        })),
      events: events
        .filter((e) => e.orderId === row.id)
        .map((e) => ({
          status: e.status,
          reason: e.reason,
          createdAt: e.createdAt.toISOString(),
        })),
    }),
  );
}
export async function guestReceipt(input: unknown) {
  const data = z
    .object({ orderId: z.uuid(), credential: capabilitySchema })
    .strict()
    .parse(input);
  const [row] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, data.orderId),
        eq(orders.guestHash, hash(data.credential)),
      ),
    );
  if (!row) throw new AppError("NOT_FOUND", 404);
  return (await orderDtos(db, row.restaurantId, [row]))[0];
}
export async function orderBoard(
  tenant: string,
  branchId: string,
  input: unknown,
) {
  const actor = await requireActor(tenant, "order:read");
  z.uuid().parse(branchId);
  requireBranch(actor, branchId);
  const data = boardInputSchema.parse(input);
  const status =
    data.status === "OPEN"
      ? inArray(orders.status, ["NEW", "ACCEPTED", "PREPARING", "READY"])
      : eq(orders.status, data.status);
  const filter = and(
    eq(orders.restaurantId, actor.restaurantId),
    eq(orders.branchId, branchId),
  );
  const pageSize = 40;
  return db.transaction(
    async (tx) => {
      const [count] = await tx
        .select({ value: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(filter, status));
      const rows = await tx
        .select()
        .from(orders)
        .where(and(filter, status))
        .orderBy(desc(orders.createdAt), desc(orders.id))
        .limit(pageSize)
        .offset((data.page - 1) * pageSize);
      const counts = await tx
        .select({ status: orders.status, count: sql<number>`count(*)::int` })
        .from(orders)
        .where(filter)
        .groupBy(orders.status);
      return boardDtoSchema.parse({
        orders: await orderDtos(tx, actor.restaurantId, rows),
        total: count.value,
        page: data.page,
        pageSize,
        counts: Object.fromEntries(
          orderStatuses.map((s) => [
            s,
            counts.find((c) => c.status === s)?.count ?? 0,
          ]),
        ),
      });
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
export async function transitionOrder(tenant: string, input: unknown) {
  const data = transitionSchema.parse(input);
  return withTenant(tenant, "order:transition", async (tx, actor) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, actor.restaurantId),
          eq(orders.id, data.orderId),
        ),
      )
      .for("update");
    if (!order) throw new AppError("NOT_FOUND", 404);
    requireBranch(actor, order.branchId);
    const [previous] = await tx
      .select()
      .from(orderEvents)
      .where(
        and(
          eq(orderEvents.restaurantId, actor.restaurantId),
          eq(orderEvents.orderId, order.id),
          eq(orderEvents.requestId, data.requestId),
        ),
      );
    if (previous) {
      if (
        previous.status !== data.nextStatus ||
        previous.reason !== data.reason ||
        previous.version !== data.expectedVersion + 1
      )
        throw new AppError("CONFLICT", 409);
      return { id: order.id, version: order.version, status: order.status };
    }
    if (order.version !== data.expectedVersion)
      throw new AppError("CONFLICT", 409);
    if (!allowedTransition(order.status, data.nextStatus))
      throw new AppError("INVALID_INPUT");
    const [updated] = await tx
      .update(orders)
      .set({
        status: data.nextStatus,
        version: order.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.restaurantId, actor.restaurantId),
          eq(orders.branchId, order.branchId),
          eq(orders.id, order.id),
          eq(orders.version, data.expectedVersion),
        ),
      )
      .returning();
    if (!updated) throw new AppError("CONFLICT", 409);
    await tx.insert(orderEvents).values({
      restaurantId: actor.restaurantId,
      orderId: order.id,
      version: updated.version,
      requestId: data.requestId,
      status: data.nextStatus,
      reason: data.reason,
      actorId: actor.userId,
    });
    await audit(
      tx,
      actor,
      `order.${data.nextStatus.toLowerCase()}`,
      order.id,
      data.reason || undefined,
    );
    return {
      id: updated.id,
      version: updated.version,
      status: updated.status as OrderStatus,
    };
  });
}
