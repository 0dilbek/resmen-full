import {
  boolean,
  foreignKey,
  pgTable,
  text,
  unique,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { restaurants } from "@/modules/restaurants/schema";
import { idColumn, timestamps } from "@/infrastructure/db/columns";
export const branches = pgTable(
  "branch",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    address: text("address").default("").notNull(),
    timezone: text("timezone").default("Asia/Tashkent").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    active: boolean("active").default(true).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("branch_tenant_id").on(t.restaurantId, t.id),
    unique("branch_tenant_slug_unique").on(t.restaurantId, t.slug),
    uniqueIndex("branch_one_default")
      .on(t.restaurantId)
      .where(sql`${t.isDefault} = true`),
  ],
);
export const branchSlugs = pgTable(
  "branch_slug",
  {
    restaurantId: uuid("restaurant_id").notNull(),
    slug: text("slug").notNull(),
    branchId: uuid("branch_id").notNull(),
  },
  (t) => [
    unique("branch_slug_reserved").on(t.restaurantId, t.slug),
    foreignKey({
      columns: [t.restaurantId, t.branchId],
      foreignColumns: [branches.restaurantId, branches.id],
    }),
  ],
);
