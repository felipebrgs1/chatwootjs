/**
 * M11 — Notificações, presença (linhas de configuração; o estado online é
 * efêmero no servidor), inscrições push e filtros salvos (views).
 * Espelha `notification`, `notification_setting`, `notification_subscription`
 * e `custom_filter` do `chatwoot/db/schema.rb`.
 *
 * notification_type: 0 assigned_conversation, 1 conversation_mention,
 *   2 participating_conversation_new_message.
 * subscription_type: 0 browser_push.
 * visibility (custom_filters): 0 personal, 1 shared.
 */
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts, users } from "./auth";

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notificableType: varchar("notificable_type", { length: 255 }),
    notificableId: integer("notificable_id"),
    notificationType: integer("notification_type").notNull().default(0),
    readAt: timestamp("read_at", { withTimezone: true }),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_notifications_on_user_id_and_read_at").on(table.userId, table.readAt),
    index("index_notifications_on_account_id").on(table.accountId),
    index("index_notifications_on_notificable").on(table.notificableType, table.notificableId),
  ],
);

export const notificationSettings = pgTable(
  "notification_settings",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Tipos com e-mail/push LIGADOS (ausente = tudo ligado, igual ao Rails).
    emailFlags: jsonb("email_flags").$type<string[]>().notNull().default([]),
    pushFlags: jsonb("push_flags").$type<string[]>().notNull().default([]),
    // Tipos com notificação in-app DESLIGADA (sino). Vazio = tudo ligado.
    mutedFlags: jsonb("muted_flags").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_notification_settings_on_account_id_and_user_id").on(
      table.accountId,
      table.userId,
    ),
  ],
);

export const notificationSubscriptions = pgTable(
  "notification_subscriptions",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    identifier: text("identifier").notNull(),
    subscriptionType: integer("subscription_type").notNull().default(0),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_notification_subscriptions_on_user_id").on(table.userId),
    index("index_notification_subscriptions_on_identifier").on(table.identifier),
  ],
);

export const customFilters = pgTable(
  "custom_filters",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    // 'conversation' no MVP (mesma query serializada da lista M4).
    modelType: varchar("model_type", { length: 50 }).notNull().default("conversation"),
    query: jsonb("query").$type<Record<string, unknown>>().notNull().default({}),
    visibility: integer("visibility").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_custom_filters_on_account_id").on(table.accountId),
    index("index_custom_filters_on_user_id").on(table.userId),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type NotificationSubscription = typeof notificationSubscriptions.$inferSelect;
export type CustomFilter = typeof customFilters.$inferSelect;
