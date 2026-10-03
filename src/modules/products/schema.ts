import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { categories } from "@/modules/categories/schema";
import { menus } from "@/modules/menus/schema";
import { idColumn, timestamps } from "@/infrastructure/db/columns";
import type { Locale } from "@/i18n/config";
export const products = pgTable(
  "product",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    priceMinor: bigint("price_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    available: boolean("available").default(true).notNull(),
    published: boolean("published").default(false).notNull(),
    featured: boolean("featured").default(false).notNull(),
    archived: boolean("archived").default(false).notNull(),
    allergens: jsonb("allergens").$type<string[]>().default([]).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    version: integer("version").default(1).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("product_tenant_id").on(t.restaurantId, t.id),
    unique("product_tenant_menu_id").on(t.restaurantId, t.menuId, t.id),
    foreignKey({
      columns: [t.restaurantId, t.menuId, t.categoryId],
      foreignColumns: [
        categories.restaurantId,
        categories.menuId,
        categories.id,
      ],
    }),
    index("product_menu_category_idx").on(
      t.restaurantId,
      t.menuId,
      t.categoryId,
      t.sortOrder,
      t.id,
    ),
    check(
      "product_price_nonnegative",
      sql`${t.priceMinor}>=0 and ${t.priceMinor}<=9999999999`,
    ),
  ],
);
export const productTranslations = pgTable(
  "product_translation",
  {
    restaurantId: uuid("restaurant_id").notNull(),
    productId: uuid("product_id").notNull(),
    locale: text("locale").$type<Locale>().notNull(),
    name: text("name").notNull(),
    description: text("description").default("").notNull(),
    ingredients: text("ingredients").default("").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.restaurantId, t.productId, t.locale] }),
    foreignKey({
      columns: [t.restaurantId, t.productId],
      foreignColumns: [products.restaurantId, products.id],
    }),
  ],
);
export const mediaAssets = pgTable(
  "media_asset",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    objectKey: text("object_key").notNull().unique(),
    state: text("state")
      .$type<"PENDING" | "READY">()
      .default("PENDING")
      .notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width").default(0).notNull(),
    height: integer("height").default(0).notNull(),
    alt: text("alt").default("").notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("media_tenant_id").on(t.restaurantId, t.id),
    unique("media_tenant_menu_id").on(t.restaurantId, t.menuId, t.id),
    foreignKey({
      columns: [t.restaurantId, t.menuId],
      foreignColumns: [menus.restaurantId, menus.id],
    }),
    index("media_tenant_state_idx").on(t.restaurantId, t.state, t.createdAt),
  ],
);
export const productImages = pgTable(
  "product_image",
  {
    restaurantId: uuid("restaurant_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    productId: uuid("product_id").notNull(),
    mediaId: uuid("media_id").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.restaurantId, t.productId, t.mediaId] }),
    foreignKey({
      columns: [t.restaurantId, t.menuId, t.productId],
      foreignColumns: [products.restaurantId, products.menuId, products.id],
    }),
    foreignKey({
      columns: [t.restaurantId, t.menuId, t.mediaId],
      foreignColumns: [
        mediaAssets.restaurantId,
        mediaAssets.menuId,
        mediaAssets.id,
      ],
    }),
  ],
);
