import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn, timestamps } from "@/infrastructure/db/columns";
import { restaurants } from "@/modules/restaurants/schema";
import { user } from "@/modules/auth/schema";
import type { z } from "zod";
import type { planLimitsSchema } from "./validation";
export const plans = pgTable(
  "billing_plan",
  {
    id: idColumn(),
    code: text("code").unique().notNull(),
    name: text("name").notNull(),
    priceMinor: bigint("price_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    limits: jsonb("limits").$type<z.infer<typeof planLimitsSchema>>().notNull(),
    active: boolean("active").default(true).notNull(),
    ...timestamps(),
  },
  (t) => [check("plan_price_nonnegative", sql`${t.priceMinor}>=0`)],
);
export const subscriptions = pgTable(
  "subscription",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    status: text("status")
      .$type<"ACTIVE" | "PAST_DUE" | "CANCELLED">()
      .default("ACTIVE")
      .notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("subscription_tenant_id").on(t.restaurantId, t.id),
    uniqueIndex("subscription_current")
      .on(t.restaurantId)
      .where(sql`${t.status} in ('ACTIVE','PAST_DUE')`),
    check("subscription_dates", sql`${t.endsAt}>${t.startsAt}`),
    check(
      "subscription_status",
      sql`${t.status} in ('ACTIVE','PAST_DUE','CANCELLED')`,
    ),
  ],
);
export const payments = pgTable(
  "payment_record",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    subscriptionId: uuid("subscription_id").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    reference: text("reference").notNull(),
    voided: boolean("voided").default(false).notNull(),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.restaurantId, t.subscriptionId],
      foreignColumns: [subscriptions.restaurantId, subscriptions.id],
    }),
    unique("payment_reference").on(t.restaurantId, t.reference),
    index("payment_tenant_time").on(t.restaurantId, t.createdAt),
    check("payment_positive", sql`${t.amountMinor}>0`),
  ],
);
