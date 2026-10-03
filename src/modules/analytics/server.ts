import "server-only";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/infrastructure/db";
import { analyticsEvents } from "./schema";
import { publicGate } from "@/modules/menus/public";
import { products, productTranslations } from "@/modules/products/schema";
import { categories } from "@/modules/categories/schema";
import { orders } from "@/modules/orders/schema";
import { requireActor, requireBranch } from "@/modules/memberships/server";
import { systemSettings } from "@/modules/platform-admin/settings";
import { rateLimit } from "@/infrastructure/http/security";
import { AppError } from "@/infrastructure/errors";
import { locales } from "@/i18n/config";
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/);
export const eventInput = z
  .object({
    id: z.uuid(),
    slug,
    branch: slug,
    locale: z.enum(locales),
    kind: z.enum(["MENU_VIEW", "PRODUCT_VIEW", "CART_ADD"]),
    productId: z.uuid().optional(),
  })
  .strict()
  .refine((v) => (v.kind === "MENU_VIEW" ? !v.productId : !!v.productId));
export async function recordPublicEvent(input: unknown) {
  const data = eventInput.parse(input);
  if (!(await systemSettings()).analyticsEnabled) return;
  const gate = await publicGate(data.slug, data.branch);
  if (!gate.settings.enabledLocales.includes(data.locale))
    throw new AppError("NOT_FOUND", 404);
  await rateLimit(`analytics:${gate.menu.id}`, 2000);
  if (data.productId) {
    const [p] = await db
      .select({ id: products.id })
      .from(products)
      .innerJoin(
        categories,
        and(
          eq(categories.restaurantId, products.restaurantId),
          eq(categories.menuId, products.menuId),
          eq(categories.id, products.categoryId),
        ),
      )
      .where(
        and(
          eq(products.restaurantId, gate.restaurant.id),
          eq(products.menuId, gate.menu.id),
          eq(products.id, data.productId),
          eq(products.archived, false),
          eq(products.published, true),
          eq(categories.visible, true),
        ),
      );
    if (!p) throw new AppError("NOT_FOUND", 404);
  }
  await db
    .insert(analyticsEvents)
    .values({
      id: data.id,
      restaurantId: gate.restaurant.id,
      branchId: gate.branch.id,
      menuId: gate.menu.id,
      productId: data.productId,
      kind: data.kind,
      locale: data.locale,
      templateId: gate.theme.config.templateId,
    })
    .onConflictDoNothing();
}
export async function recordQrScan(context: {
  restaurantId: string;
  branchId: string;
  menuId: string;
  locale: string;
}) {
  if (!(await systemSettings()).analyticsEnabled) return;
  await rateLimit(`qr-analytics:${context.menuId}`, 2000);
  await db.insert(analyticsEvents).values({
    id: randomUUID(),
    ...context,
    kind: "QR_SCAN",
    templateId: "qr",
  });
}
export async function analyticsReport(
  restaurantId: string,
  branchId: string,
  input: unknown,
) {
  const actor = await requireActor(restaurantId, "analytics:read");
  z.uuid().parse(branchId);
  requireBranch(actor, branchId);
  const days = z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
    .parse(input);
  const since = new Date(Date.now() - days * 86400000);
  const scope = and(
    eq(analyticsEvents.restaurantId, actor.restaurantId),
    eq(analyticsEvents.branchId, branchId),
    gte(analyticsEvents.createdAt, since),
  );
  const orderScope = and(
    eq(orders.restaurantId, actor.restaurantId),
    eq(orders.branchId, branchId),
    gte(orders.createdAt, since),
  );
  return db.transaction(
    async (tx) => {
      const events = await tx
        .select({ kind: analyticsEvents.kind, n: count() })
        .from(analyticsEvents)
        .where(scope)
        .groupBy(analyticsEvents.kind);
      const daily = await tx
        .select({
          day: sql<string>`to_char(${analyticsEvents.createdAt} at time zone 'UTC','YYYY-MM-DD')`,
          n: count(),
        })
        .from(analyticsEvents)
        .where(and(scope, eq(analyticsEvents.kind, "MENU_VIEW")))
        .groupBy(sql`1`)
        .orderBy(sql`1`);
      const language = await tx
        .select({ locale: analyticsEvents.locale, n: count() })
        .from(analyticsEvents)
        .where(and(scope, eq(analyticsEvents.kind, "MENU_VIEW")))
        .groupBy(analyticsEvents.locale);
      const popular = await tx
        .select({
          id: analyticsEvents.productId,
          name: productTranslations.name,
          n: count(),
        })
        .from(analyticsEvents)
        .leftJoin(
          productTranslations,
          and(
            eq(productTranslations.restaurantId, analyticsEvents.restaurantId),
            eq(productTranslations.productId, analyticsEvents.productId),
            eq(productTranslations.locale, "uz"),
          ),
        )
        .where(and(scope, eq(analyticsEvents.kind, "PRODUCT_VIEW")))
        .groupBy(analyticsEvents.productId, productTranslations.name)
        .orderBy(desc(count()))
        .limit(10);
      const sales = await tx
        .select({
          currency: orders.currency,
          status: orders.status,
          n: count(),
          total: sql<string>`sum(${orders.totalMinor})::text`,
        })
        .from(orders)
        .where(orderScope)
        .groupBy(orders.currency, orders.status);
      return { days, events, daily, language, popular, sales };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
