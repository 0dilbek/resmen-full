import {
  boolean,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn, timestamps } from "@/infrastructure/db/columns";
import type { Locale } from "@/i18n/config";
export const restaurantStatus = pgEnum("restaurant_status", [
  "DRAFT",
  "ACTIVE",
  "SUSPENDED",
  "ARCHIVED",
]);
export const restaurants = pgTable("restaurant", {
  id: idColumn(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").default("").notNull(),
  status: restaurantStatus("status").default("DRAFT").notNull(),
  phone: text("phone").default("").notNull(),
  address: text("address").default("").notNull(),
  logo: text("logo"),
  cover: text("cover"),
  ...timestamps(),
});
export const restaurantSettings = pgTable(
  "restaurant_settings",
  {
    restaurantId: uuid("restaurant_id")
      .primaryKey()
      .references(() => restaurants.id),
    defaultLocale: text("default_locale")
      .$type<Locale>()
      .default("uz")
      .notNull(),
    enabledLocales: jsonb("enabled_locales")
      .$type<Locale[]>()
      .default(["uz", "ru", "en"])
      .notNull(),
    currency: text("currency").default("UZS").notNull(),
    orderingEnabled: boolean("ordering_enabled").default(false).notNull(),
  },
  (t) => [
    check("settings_locale", sql`${t.defaultLocale} in ('uz','ru','en')`),
    check("settings_currency", sql`${t.currency} in ('UZS','USD','EUR')`),
  ],
);
export const restaurantSlugs = pgTable(
  "restaurant_slug",
  {
    slug: text("slug").primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
  },
  (t) => [index("restaurant_slug_tenant_idx").on(t.restaurantId)],
);
