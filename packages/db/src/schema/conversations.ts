import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts, users } from "./auth";
import { contactInboxes, contacts } from "./contacts";
import { inboxes } from "./inboxes";

// Conversas — espelha chatwoot/db/schema.rb.
// status: 0 open, 1 resolved, 2 pending, 3 snoozed.
// priority: 0 none, 1 low, 2 medium, 3 high, 4 urgent.

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    inboxId: integer("inbox_id")
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),
    status: integer("status").notNull().default(0),
    assigneeId: integer("assignee_id").references(() => users.id, { onDelete: "set null" }),
    contactId: integer("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    displayId: integer("display_id").notNull(),
    contactLastSeenAt: timestamp("contact_last_seen_at", { withTimezone: true }),
    agentLastSeenAt: timestamp("agent_last_seen_at", { withTimezone: true }),
    additionalAttributes: jsonb("additional_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    contactInboxId: integer("contact_inbox_id").references(() => contactInboxes.id, {
      onDelete: "set null",
    }),
    uuid: varchar("uuid", { length: 64 }).notNull().unique(),
    identifier: varchar("identifier", { length: 255 }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    teamId: integer("team_id"),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    customAttributes: jsonb("custom_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    assigneeLastSeenAt: timestamp("assignee_last_seen_at", { withTimezone: true }),
    firstReplyCreatedAt: timestamp("first_reply_created_at", { withTimezone: true }),
    priority: integer("priority"),
    waitingSince: timestamp("waiting_since", { withTimezone: true }),
    cachedLabelList: text("cached_label_list").notNull().default(""),
    muted: boolean("muted").notNull().default(false),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    unreadIncomingMessagesCount: integer("unread_incoming_messages_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_conversations_on_account_id_and_display_id").on(table.accountId, table.displayId),
    index("conv_acid_inbid_stat_asgnid_idx").on(
      table.accountId,
      table.inboxId,
      table.status,
      table.assigneeId,
    ),
    index("index_conversations_on_account_id_status_created_at").on(
      table.accountId,
      table.status,
      table.createdAt,
    ),
    index("index_conversations_on_assignee_id_and_account_id").on(
      table.assigneeId,
      table.accountId,
    ),
    index("index_conversations_on_contact_id").on(table.contactId),
    index("index_conversations_on_inbox_id").on(table.inboxId),
    index("index_conversations_on_priority").on(table.priority),
    index("index_conversations_on_status_and_account_id").on(table.status, table.accountId),
    index("index_conversations_on_team_id").on(table.teamId),
    index("index_conversations_on_waiting_since").on(table.waitingSince),
  ],
);

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_conversation_participants_on_user_id_and_conversation_id").on(
      table.userId,
      table.conversationId,
    ),
    index("index_conversation_participants_on_account_id").on(table.accountId),
    index("index_conversation_participants_on_conversation_id").on(table.conversationId),
  ],
);

export const mentions = pgTable(
  "mentions",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    mentionedBy: integer("mentioned_by").references(() => users.id, { onDelete: "set null" }),
    mentionedAt: timestamp("mentioned_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_mentions_on_user_id_and_conversation_id").on(table.userId, table.conversationId),
    index("index_mentions_on_account_id").on(table.accountId),
    index("index_mentions_on_conversation_id").on(table.conversationId),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type Mention = typeof mentions.$inferSelect;
