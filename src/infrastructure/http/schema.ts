import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
export const requestLimits = pgTable("request_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
