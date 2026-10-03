import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "@/modules/auth/schema";
export const platformGrants = pgTable("platform_grant", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const platformSettings = pgTable("platform_settings", {
  id: text("id").primaryKey(),
  registrationEnabled: boolean("registration_enabled").default(true).notNull(),
  orderingEnabled: boolean("ordering_enabled").default(true).notNull(),
  analyticsEnabled: boolean("analytics_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
