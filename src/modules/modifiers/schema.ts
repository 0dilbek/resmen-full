import {
  bigint,
  boolean,
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { menus } from "@/modules/menus/schema";
import { products } from "@/modules/products/schema";
import { idColumn, timestamps } from "@/infrastructure/db/columns";
import type { Locale } from "@/i18n/config";
export type LocalizedNames = Record<Locale, string>;
export const modifierGroups = pgTable(
  "modifier_group",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    names: jsonb("names").$type<LocalizedNames>().notNull(),
    minSelections: integer("min_selections").default(0).notNull(),
    maxSelections: integer("max_selections").default(1).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("modifier_group_tenant_id").on(t.restaurantId, t.id),
    unique("modifier_group_tenant_menu_id").on(t.restaurantId, t.menuId, t.id),
    foreignKey({
      columns: [t.restaurantId, t.menuId],
      foreignColumns: [menus.restaurantId, menus.id],
    }),
    check(
      "modifier_selection_limits",
      sql`${t.minSelections}>=0 and ${t.maxSelections}>=${t.minSelections} and ${t.maxSelections}<=20`,
    ),
  ],
);
export const modifierOptions = pgTable(
  "modifier_option",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    groupId: uuid("group_id").notNull(),
    names: jsonb("names").$type<LocalizedNames>().notNull(),
    priceDeltaMinor: bigint("price_delta_minor", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    available: boolean("available").default(true).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("modifier_option_tenant_id").on(t.restaurantId, t.id),
    foreignKey({
      columns: [t.restaurantId, t.groupId],
      foreignColumns: [modifierGroups.restaurantId, modifierGroups.id],
    }),
    check(
      "modifier_price_nonnegative",
      sql`${t.priceDeltaMinor}>=0 and ${t.priceDeltaMinor}<=9999999999`,
    ),
  ],
);
export const productModifierGroups = pgTable(
  "product_modifier_group",
  {
    restaurantId: uuid("restaurant_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    productId: uuid("product_id").notNull(),
    groupId: uuid("group_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.restaurantId, t.productId, t.groupId] }),
    foreignKey({
      columns: [t.restaurantId, t.menuId, t.productId],
      foreignColumns: [products.restaurantId, products.menuId, products.id],
    }),
    foreignKey({
      columns: [t.restaurantId, t.menuId, t.groupId],
      foreignColumns: [
        modifierGroups.restaurantId,
        modifierGroups.menuId,
        modifierGroups.id,
      ],
    }),
  ],
);
