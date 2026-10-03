import {
  boolean,
  foreignKey,
  integer,
  pgTable,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { branches } from "@/modules/branches/schema";
import { idColumn, timestamps } from "@/infrastructure/db/columns";
export const menus = pgTable(
  "menu",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    published: boolean("published").default(false).notNull(),
    catalogRevision: integer("catalog_revision").default(1).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("menu_tenant_id").on(t.restaurantId, t.id),
    unique("menu_tenant_branch_id").on(t.restaurantId, t.branchId, t.id),
    unique("menu_branch").on(t.restaurantId, t.branchId),
    foreignKey({
      columns: [t.restaurantId, t.branchId],
      foreignColumns: [branches.restaurantId, branches.id],
    }),
  ],
);
