import {
  bigint,
  bigserial,
  integer,
  jsonb,
  text,
  timestamp,
  varchar,
  pgTable,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const customFilters = pgTable(
  "custom_filters",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    filterType: integer("filter_type").notNull().default(0),
    query: jsonb("query").notNull().default("{}"),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_custom_filters_on_account_id").on(table.accountId),
    index("index_custom_filters_on_user_id").on(table.userId),
  ],
);

export const notificationSettings = pgTable(
  "notification_settings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id"),
    userId: integer("user_id"),
    emailFlags: integer("email_flags").notNull().default(0),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    pushFlags: integer("push_flags").notNull().default(0),
  },
  (table) => [uniqueIndex("by_account_user").on(table.accountId, table.userId)],
);

export const notificationSubscriptions = pgTable(
  "notification_subscriptions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    subscriptionType: integer("subscription_type").notNull(),
    subscriptionAttributes: jsonb("subscription_attributes").notNull().default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    identifier: text("identifier"),
  },
  (table) => [
    uniqueIndex("index_notification_subscriptions_on_identifier").on(table.identifier),
    index("index_notification_subscriptions_on_user_id").on(table.userId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    notificationType: integer("notification_type").notNull(),
    primaryActorType: varchar("primary_actor_type", { length: 255 }).notNull(),
    primaryActorId: bigint("primary_actor_id", { mode: "number" }).notNull(),
    secondaryActorType: varchar("secondary_actor_type", { length: 255 }),
    secondaryActorId: bigint("secondary_actor_id", { mode: "number" }),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    snoozedUntil: timestamp("snoozed_until"),
    lastActivityAt: timestamp("last_activity_at").default(sql`CURRENT_TIMESTAMP`),
    meta: jsonb("meta").default({}),
  },
  (table) => [
    index("index_notifications_on_account_id").on(table.accountId),
    index("index_notifications_on_last_activity_at").on(table.lastActivityAt),
    index("uniq_primary_actor_per_account_notifications").on(
      table.primaryActorType,
      table.primaryActorId,
    ),
    index("uniq_secondary_actor_per_account_notifications").on(
      table.secondaryActorType,
      table.secondaryActorId,
    ),
    index("idx_notifications_performance").on(
      table.userId,
      table.accountId,
      table.snoozedUntil,
      table.readAt,
    ),
    index("index_notifications_on_user_id").on(table.userId),
  ],
);

export type CustomFilter = typeof customFilters.$inferSelect;
export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type NotificationSubscription = typeof notificationSubscriptions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
