import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  foreignKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { menus } from "@/modules/menus/schema";
import { products } from "@/modules/products/schema";
export const analyticsEvents = pgTable(
  "analytics_event",
  {
    id: uuid("id").primaryKey(),
    restaurantId: uuid("restaurant_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    productId: uuid("product_id"),
    kind: text("kind")
      .$type<"MENU_VIEW" | "PRODUCT_VIEW" | "CART_ADD" | "QR_SCAN">()
      .notNull(),
    locale: text("locale").notNull(),
    templateId: text("template_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.restaurantId, t.branchId, t.menuId],
      foreignColumns: [menus.restaurantId, menus.branchId, menus.id],
    }),
    foreignKey({
      columns: [t.restaurantId, t.menuId, t.productId],
      foreignColumns: [products.restaurantId, products.menuId, products.id],
    }),
    index("analytics_tenant_branch_time").on(
      t.restaurantId,
      t.branchId,
      t.createdAt,
    ),
    check(
      "analytics_kind",
      sql`${t.kind} in ('MENU_VIEW','PRODUCT_VIEW','CART_ADD','QR_SCAN')`,
    ),
    check(
      "analytics_product_shape",
      sql`(${t.kind} in ('PRODUCT_VIEW','CART_ADD') and ${t.productId} is not null) or (${t.kind} in ('MENU_VIEW','QR_SCAN') and ${t.productId} is null)`,
    ),
  ],
);
