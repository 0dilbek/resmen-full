"use server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AppError, failure, type ActionResult } from "@/infrastructure/errors";
import { withPlatform, platformAudit } from "./server";
import { restaurants } from "@/modules/restaurants/schema";
import { templateCatalog } from "@/modules/templates/schema";
import { templateIds } from "@/modules/templates/registry";
import { plans, subscriptions, payments } from "@/modules/billing/schema";
import { planSchema, reasonSchema } from "@/modules/billing/validation";
import { platformSettings } from "./schema";
import { supportTickets } from "@/modules/support/schema";
const commandSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("restaurant"),
      id: z.uuid(),
      status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED"]),
      reason: reasonSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("template"),
      id: z.enum(templateIds),
      status: z.enum(["ACTIVE", "RETIRED", "BLOCKED"]),
      reason: reasonSchema,
    })
    .strict(),
  z
    .object({ kind: z.literal("plan"), plan: planSchema, reason: reasonSchema })
    .strict(),
  z
    .object({
      kind: z.literal("planStatus"),
      id: z.uuid(),
      active: z.boolean(),
      reason: reasonSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("subscription"),
      restaurantId: z.uuid(),
      planId: z.uuid(),
      endsAt: z.iso.datetime(),
      reason: reasonSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("cancelSubscription"),
      restaurantId: z.uuid(),
      id: z.uuid(),
      reason: reasonSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("payment"),
      restaurantId: z.uuid(),
      subscriptionId: z.uuid(),
      amountMinor: z.string().regex(/^[1-9]\d{0,11}$/),
      reference: z.string().trim().min(3).max(100),
      reason: reasonSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("voidPayment"),
      restaurantId: z.uuid(),
      id: z.uuid(),
      reason: reasonSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("settings"),
      registrationEnabled: z.boolean(),
      orderingEnabled: z.boolean(),
      analyticsEnabled: z.boolean(),
      reason: reasonSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("resolveTicket"),
      id: z.uuid(),
      reason: reasonSchema,
    })
    .strict(),
]);
export async function platformCommand(input: unknown): Promise<ActionResult> {
  try {
    const data = commandSchema.parse(input);
    await withPlatform(async (tx, actor) => {
      let resource = "global";
      let tenant: string | undefined;
      if (data.kind === "restaurant") {
        const [r] = await tx
          .select()
          .from(restaurants)
          .where(eq(restaurants.id, data.id))
          .for("update");
        if (!r || r.status === "ARCHIVED") throw new AppError("NOT_FOUND", 404);
        await tx
          .update(restaurants)
          .set({ status: data.status, updatedAt: new Date() })
          .where(eq(restaurants.id, r.id));
        resource = r.id;
        tenant = r.id;
      } else if (data.kind === "template") {
        if (data.id === "minimal-01" && data.status !== "ACTIVE")
          throw new AppError("FORBIDDEN", 403);
        await tx
          .update(templateCatalog)
          .set({ status: data.status, updatedAt: new Date() })
          .where(eq(templateCatalog.id, data.id));
        resource = data.id;
      } else if (data.kind === "plan") {
        const [p] = await tx
          .insert(plans)
          .values({ ...data.plan, priceMinor: BigInt(data.plan.priceMinor) })
          .returning({ id: plans.id });
        resource = p.id;
      } else if (data.kind === "planStatus") {
        const [p] = await tx
          .update(plans)
          .set({ active: data.active, updatedAt: new Date() })
          .where(eq(plans.id, data.id))
          .returning({ id: plans.id });
        if (!p) throw new AppError("NOT_FOUND", 404);
        resource = p.id;
      } else if (
        data.kind === "subscription" ||
        data.kind === "cancelSubscription" ||
        data.kind === "payment" ||
        data.kind === "voidPayment"
      ) {
        const [r] = await tx
          .select({ id: restaurants.id })
          .from(restaurants)
          .where(eq(restaurants.id, data.restaurantId))
          .for("update");
        if (!r) throw new AppError("NOT_FOUND", 404);
        tenant = r.id;
        if (data.kind === "subscription") {
          const end = new Date(data.endsAt);
          if (end <= new Date() || end.getTime() > Date.now() + 366 * 86400000)
            throw new AppError("INVALID_INPUT", 400);
          const [p] = await tx
            .select()
            .from(plans)
            .where(and(eq(plans.id, data.planId), eq(plans.active, true)))
            .for("share");
          if (!p) throw new AppError("NOT_FOUND", 404);
          await tx
            .update(subscriptions)
            .set({ status: "CANCELLED", updatedAt: new Date() })
            .where(
              and(
                eq(subscriptions.restaurantId, r.id),
                sql`${subscriptions.status} in ('ACTIVE','PAST_DUE')`,
              ),
            );
          const [s] = await tx
            .insert(subscriptions)
            .values({ restaurantId: r.id, planId: p.id, endsAt: end })
            .returning({ id: subscriptions.id });
          resource = s.id;
        } else if (data.kind === "cancelSubscription") {
          const [s] = await tx
            .update(subscriptions)
            .set({ status: "CANCELLED", updatedAt: new Date() })
            .where(
              and(
                eq(subscriptions.restaurantId, r.id),
                eq(subscriptions.id, data.id),
              ),
            )
            .returning({ id: subscriptions.id });
          if (!s) throw new AppError("NOT_FOUND", 404);
          resource = s.id;
        } else if (data.kind === "payment") {
          const [s] = await tx
            .select({ currency: plans.currency })
            .from(subscriptions)
            .innerJoin(plans, eq(plans.id, subscriptions.planId))
            .where(
              and(
                eq(subscriptions.restaurantId, r.id),
                eq(subscriptions.id, data.subscriptionId),
              ),
            );
          if (!s) throw new AppError("NOT_FOUND", 404);
          const [p] = await tx
            .insert(payments)
            .values({
              restaurantId: r.id,
              subscriptionId: data.subscriptionId,
              amountMinor: BigInt(data.amountMinor),
              currency: s.currency,
              reference: data.reference,
              recordedBy: actor.userId,
            })
            .returning({ id: payments.id });
          resource = p.id;
        } else {
          const [p] = await tx
            .update(payments)
            .set({ voided: true })
            .where(
              and(eq(payments.restaurantId, r.id), eq(payments.id, data.id)),
            )
            .returning({ id: payments.id });
          if (!p) throw new AppError("NOT_FOUND", 404);
          resource = p.id;
        }
      } else if (data.kind === "settings") {
        const values = {
          registrationEnabled: data.registrationEnabled,
          orderingEnabled: data.orderingEnabled,
          analyticsEnabled: data.analyticsEnabled,
          updatedAt: new Date(),
        };
        await tx
          .insert(platformSettings)
          .values({ id: "global", ...values })
          .onConflictDoUpdate({ target: platformSettings.id, set: values });
      } else {
        const [ticket] = await tx
          .update(supportTickets)
          .set({ resolved: true })
          .where(eq(supportTickets.id, data.id))
          .returning({ id: supportTickets.id });
        if (!ticket) throw new AppError("NOT_FOUND", 404);
        resource = ticket.id;
      }
      await platformAudit(
        tx,
        actor.userId,
        `platform.${data.kind}`,
        resource,
        data.reason,
        tenant,
      );
    });
    revalidatePath("/[locale]/platform", "layout");
    revalidatePath("/[locale]/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
