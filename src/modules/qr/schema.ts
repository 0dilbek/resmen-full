import {
  boolean,
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn, timestamps } from "@/infrastructure/db/columns";
import { restaurants } from "@/modules/restaurants/schema";
import { branches } from "@/modules/branches/schema";
export const qrKind = pgEnum("qr_kind", ["RESTAURANT", "BRANCH", "TABLE"]);
export const diningTables = pgTable(
  "dining_table",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    label: text("label").notNull(),
    active: boolean("active").default(true).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("table_tenant_branch_id").on(t.restaurantId, t.branchId, t.id),
    unique("table_branch_label").on(t.restaurantId, t.branchId, t.label),
    foreignKey({
      columns: [t.restaurantId, t.branchId],
      foreignColumns: [branches.restaurantId, branches.id],
    }),
  ],
);
export const qrCodes = pgTable(
  "qr_code",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    branchId: uuid("branch_id"),
    tableId: uuid("table_id"),
    kind: qrKind("kind").notNull(),
    label: text("label").notNull(),
    token: text("token").notNull().unique(),
    active: boolean("active").default(true).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("qr_tenant_id").on(t.restaurantId, t.id),
    unique("qr_tenant_branch_id").on(t.restaurantId, t.branchId, t.id),
    foreignKey({
      columns: [t.restaurantId, t.branchId],
      foreignColumns: [branches.restaurantId, branches.id],
    }),
    foreignKey({
      columns: [t.restaurantId, t.branchId, t.tableId],
      foreignColumns: [
        diningTables.restaurantId,
        diningTables.branchId,
        diningTables.id,
      ],
    }),
    index("qr_tenant_branch_idx").on(t.restaurantId, t.branchId),
    check(
      "qr_shape",
      sql`(${t.kind}='RESTAURANT' and ${t.branchId} is null and ${t.tableId} is null) or (${t.kind}='BRANCH' and ${t.branchId} is not null and ${t.tableId} is null) or (${t.kind}='TABLE' and ${t.branchId} is not null and ${t.tableId} is not null)`,
    ),
  ],
);
