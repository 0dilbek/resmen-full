import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { idColumn, timestamps } from "@/infrastructure/db/columns";
import { branches } from "@/modules/branches/schema";
import { menus } from "@/modules/menus/schema";
import { products } from "@/modules/products/schema";
import { modifierOptions } from "@/modules/modifiers/schema";
import { diningTables, qrCodes } from "@/modules/qr/schema";
import { user } from "@/modules/auth/schema";
import { orderStatuses } from "./validation";
export const orderStatus = pgEnum("order_status", orderStatuses);
export const orderCounters = pgTable(
  "order_counter",
  {
    restaurantId: uuid("restaurant_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    lastNumber: integer("last_number").default(0).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.restaurantId, t.branchId] }),
    foreignKey({
      columns: [t.restaurantId, t.branchId],
      foreignColumns: [branches.restaurantId, branches.id],
    }),
  ],
);
export const orders = pgTable(
  "customer_order",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    tableId: uuid("table_id").notNull(),
    qrId: uuid("qr_id").notNull(),
    number: integer("number").notNull(),
    tableLabel: text("table_label").notNull(),
    status: orderStatus("status").default("NEW").notNull(),
    version: integer("version").default(1).notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    guestHash: text("guest_hash").notNull(),
    locale: text("locale").notNull(),
    totalMinor: bigint("total_minor", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    notes: text("notes").default("").notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("order_tenant_id").on(t.restaurantId, t.id),
    unique("order_tenant_menu_id").on(t.restaurantId, t.menuId, t.id),
    unique("order_idempotency").on(
      t.restaurantId,
      t.branchId,
      t.idempotencyKey,
    ),
    unique("order_branch_number").on(t.restaurantId, t.branchId, t.number),
    foreignKey({
      columns: [t.restaurantId, t.branchId],
      foreignColumns: [branches.restaurantId, branches.id],
    }),
    foreignKey({
      columns: [t.restaurantId, t.branchId, t.menuId],
      foreignColumns: [menus.restaurantId, menus.branchId, menus.id],
    }),
    foreignKey({
      columns: [t.restaurantId, t.branchId, t.tableId],
      foreignColumns: [
        diningTables.restaurantId,
        diningTables.branchId,
        diningTables.id,
      ],
    }),
    foreignKey({
      columns: [t.restaurantId, t.branchId, t.qrId],
      foreignColumns: [qrCodes.restaurantId, qrCodes.branchId, qrCodes.id],
    }),
    index("order_branch_status_created_idx").on(
      t.restaurantId,
      t.branchId,
      t.status,
      t.createdAt,
      t.id,
    ),
    index("order_branch_updated_idx").on(
      t.restaurantId,
      t.branchId,
      t.updatedAt,
      t.id,
    ),
    check(
      "order_total_bound",
      sql`${t.totalMinor}>=0 and ${t.totalMinor}<=99999999999999`,
    ),
  ],
);
export const orderItems = pgTable(
  "order_item",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    orderId: uuid("order_id").notNull(),
    productId: uuid("product_id").notNull(),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    unitMinor: bigint("unit_minor", { mode: "bigint" }).notNull(),
    totalMinor: bigint("total_minor", { mode: "bigint" }).notNull(),
    note: text("note").default("").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [
    unique("order_item_tenant_id").on(t.restaurantId, t.id),
    foreignKey({
      columns: [t.restaurantId, t.menuId, t.orderId],
      foreignColumns: [orders.restaurantId, orders.menuId, orders.id],
    }),
    foreignKey({
      columns: [t.restaurantId, t.menuId, t.productId],
      foreignColumns: [products.restaurantId, products.menuId, products.id],
    }),
    check("order_item_quantity", sql`${t.quantity} between 1 and 99`),
    check(
      "order_item_money",
      sql`${t.unitMinor}>=0 and ${t.totalMinor}=${t.unitMinor}*${t.quantity}`,
    ),
    index("order_item_parent_idx").on(t.restaurantId, t.orderId, t.position),
  ],
);
export const orderItemModifiers = pgTable(
  "order_item_modifier",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    itemId: uuid("item_id").notNull(),
    optionId: uuid("option_id").notNull(),
    name: text("name").notNull(),
    groupName: text("group_name").notNull(),
    priceDeltaMinor: bigint("price_delta_minor", { mode: "bigint" }).notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.restaurantId, t.itemId],
      foreignColumns: [orderItems.restaurantId, orderItems.id],
    }),
    foreignKey({
      columns: [t.restaurantId, t.optionId],
      foreignColumns: [modifierOptions.restaurantId, modifierOptions.id],
    }),
    unique("order_item_option").on(t.restaurantId, t.itemId, t.optionId),
  ],
);
export const orderEvents = pgTable(
  "order_event",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").notNull(),
    orderId: uuid("order_id").notNull(),
    version: integer("version").notNull(),
    requestId: uuid("request_id").notNull(),
    status: orderStatus("status").notNull(),
    reason: text("reason").default("").notNull(),
    actorId: text("actor_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.restaurantId, t.orderId],
      foreignColumns: [orders.restaurantId, orders.id],
    }),
    unique("order_event_version").on(t.restaurantId, t.orderId, t.version),
    unique("order_event_request").on(t.restaurantId, t.orderId, t.requestId),
  ],
);
