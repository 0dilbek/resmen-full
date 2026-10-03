import {
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { menus } from "@/modules/menus/schema";
import { user } from "@/modules/auth/schema";
import { idColumn, timestamps } from "@/infrastructure/db/columns";
import type { ThemeConfig } from "./config";
import type { TemplateId } from "./registry";
export const templateStatus = pgEnum("template_status", [
  "ACTIVE",
  "RETIRED",
  "BLOCKED",
]);
export const templateCatalog = pgTable("template_catalog", {
  id: text("id").$type<TemplateId>().primaryKey(),
  status: templateStatus("status").default("ACTIVE").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const templateRevisions = pgTable(
  "template_revision",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    templateId: text("template_id").$type<TemplateId>().notNull(),
    config: jsonb("config").$type<ThemeConfig>().notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("template_revision_tenant_menu_id").on(
      t.restaurantId,
      t.menuId,
      t.id,
    ),
    foreignKey({
      columns: [t.restaurantId, t.menuId],
      foreignColumns: [menus.restaurantId, menus.id],
    }),
  ],
);
export const templateConfigs = pgTable(
  "template_config",
  {
    restaurantId: uuid("restaurant_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    draft: jsonb("draft").$type<ThemeConfig>().notNull(),
    draftVersion: integer("draft_version").default(1).notNull(),
    publishedRevisionId: uuid("published_revision_id"),
    ...timestamps(),
  },
  (t) => [
    primaryKey({ columns: [t.restaurantId, t.menuId] }),
    foreignKey({
      columns: [t.restaurantId, t.menuId],
      foreignColumns: [menus.restaurantId, menus.id],
    }),
    foreignKey({
      columns: [t.restaurantId, t.menuId, t.publishedRevisionId],
      foreignColumns: [
        templateRevisions.restaurantId,
        templateRevisions.menuId,
        templateRevisions.id,
      ],
    }),
  ],
);
