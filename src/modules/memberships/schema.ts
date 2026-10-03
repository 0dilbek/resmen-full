import {
  boolean,
  check,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "@/modules/auth/schema";
import { restaurants } from "@/modules/restaurants/schema";
import { branches } from "@/modules/branches/schema";
import { idColumn, timestamps } from "@/infrastructure/db/columns";
export const memberRole = pgEnum("member_role", [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "CASHIER",
]);
export const memberships = pgTable(
  "membership",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    role: memberRole("role").notNull(),
    allBranches: boolean("all_branches").default(false).notNull(),
    active: boolean("active").default(true).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("membership_user_tenant").on(t.restaurantId, t.userId),
    unique("membership_tenant_id").on(t.restaurantId, t.id),
    index("membership_user_idx").on(t.userId, t.active),
    check(
      "membership_scope",
      sql`(${t.role} in ('OWNER','ADMIN') and ${t.allBranches}) or (${t.role} = 'CASHIER' and not ${t.allBranches}) or ${t.role} = 'MANAGER'`,
    ),
  ],
);
export const memberBranches = pgTable(
  "membership_branch",
  {
    restaurantId: uuid("restaurant_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    branchId: uuid("branch_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.restaurantId, t.membershipId, t.branchId] }),
    foreignKey({
      columns: [t.restaurantId, t.membershipId],
      foreignColumns: [memberships.restaurantId, memberships.id],
    }),
    foreignKey({
      columns: [t.restaurantId, t.branchId],
      foreignColumns: [branches.restaurantId, branches.id],
    }),
  ],
);
export const invitations = pgTable(
  "invitation",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    email: text("email").notNull(),
    role: memberRole("role").notNull(),
    allBranches: boolean("all_branches").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    ...timestamps(),
  },
  (t) => [
    unique("invitation_tenant_id").on(t.restaurantId, t.id),
    index("invitation_tenant_idx").on(t.restaurantId, t.email),
  ],
);
export const invitationBranches = pgTable(
  "invitation_branch",
  {
    restaurantId: uuid("restaurant_id").notNull(),
    invitationId: uuid("invitation_id").notNull(),
    branchId: uuid("branch_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.restaurantId, t.invitationId, t.branchId] }),
    foreignKey({
      columns: [t.restaurantId, t.invitationId],
      foreignColumns: [invitations.restaurantId, invitations.id],
    }),
    foreignKey({
      columns: [t.restaurantId, t.branchId],
      foreignColumns: [branches.restaurantId, branches.id],
    }),
  ],
);
export const auditLogs = pgTable(
  "audit_log",
  {
    id: idColumn(),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id),
    actorId: text("actor_id").references(() => user.id),
    scope: text("scope").notNull(),
    action: text("action").notNull(),
    resourceId: text("resource_id"),
    reason: text("reason"),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("audit_tenant_time_idx").on(t.restaurantId, t.createdAt)],
);
