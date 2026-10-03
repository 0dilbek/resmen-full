import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { idColumn } from "@/infrastructure/db/columns";
import { restaurants } from "@/modules/restaurants/schema";
export const supportTickets = pgTable(
  "support_ticket",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id),
    email: text("email").notNull(),
    name: text("name").notNull(),
    message: text("message").notNull(),
    resolved: boolean("resolved").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("support_open_time").on(t.resolved, t.createdAt)],
);
