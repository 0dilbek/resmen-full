import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { menus } from "@/modules/menus/schema";
import { idColumn, timestamps } from "@/infrastructure/db/columns";
import type { Locale } from "@/i18n/config";
export const categories = pgTable(
  "category",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    visible: boolean("visible").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("category_tenant_id").on(t.restaurantId, t.id),
    unique("category_tenant_menu_id").on(t.restaurantId, t.menuId, t.id),
    foreignKey({
      columns: [t.restaurantId, t.menuId],
      foreignColumns: [menus.restaurantId, menus.id],
    }),
    index("category_menu_order_idx").on(
      t.restaurantId,
      t.menuId,
      t.sortOrder,
      t.id,
    ),
  ],
);
export const categoryTranslations = pgTable(
  "category_translation",
  {
    restaurantId: uuid("restaurant_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    locale: text("locale").$type<Locale>().notNull(),
    name: text("name").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.restaurantId, t.categoryId, t.locale] }),
    foreignKey({
      columns: [t.restaurantId, t.categoryId],
      foreignColumns: [categories.restaurantId, categories.id],
    }),
  ],
);
