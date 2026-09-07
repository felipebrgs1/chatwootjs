import {
  bigint,
  bigserial,
  integer,
  jsonb,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
  pgTable,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_conversation_participants_on_account_id").on(table.accountId),
    index("index_conversation_participants_on_conversation_id").on(table.conversationId),
    uniqueIndex("index_conversation_participants_on_user_id_and_conversation_id").on(
      table.userId,
      table.conversationId,
    ),
    index("index_conversation_participants_on_user_id").on(table.userId),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id").notNull(),
    inboxId: integer("inbox_id").notNull(),
    status: integer("status").notNull().default(0),
    assigneeId: integer("assignee_id"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    contactId: bigint("contact_id", { mode: "number" }),
    displayId: integer("display_id").notNull(),
    contactLastSeenAt: timestamp("contact_last_seen_at"),
    agentLastSeenAt: timestamp("agent_last_seen_at"),
    additionalAttributes: jsonb("additional_attributes").default({}),
    contactInboxId: bigint("contact_inbox_id", { mode: "number" }),
    uuid: uuid("uuid")
      .notNull()
      .default(sql`gen_random_uuid()`),
    identifier: varchar("identifier", { length: 255 }),
    lastActivityAt: timestamp("last_activity_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    teamId: bigint("team_id", { mode: "number" }),
    campaignId: bigint("campaign_id", { mode: "number" }),
    snoozedUntil: timestamp("snoozed_until"),
    customAttributes: jsonb("custom_attributes").default({}),
    assigneeLastSeenAt: timestamp("assignee_last_seen_at"),
    firstReplyCreatedAt: timestamp("first_reply_created_at"),
    priority: integer("priority"),
    slaPolicyId: bigint("sla_policy_id", { mode: "number" }),
    waitingSince: timestamp("waiting_since"),
    cachedLabelList: text("cached_label_list"),
    assigneeAgentBotId: bigint("assignee_agent_bot_id", { mode: "number" }),
    aiAssigneeType: varchar("ai_assignee_type", { length: 255 }),
    statusChangedAt: timestamp("status_changed_at"),
  },
  (table) => [
    uniqueIndex("index_conversations_on_account_id_and_display_id").on(
      table.accountId,
      table.displayId,
    ),
    index("index_conversations_on_id_and_account_id").on(table.accountId, table.id),
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
    index("index_conversations_on_account_id").on(table.accountId),
    index("index_conversations_on_assignee_id_and_account_id").on(
      table.assigneeId,
      table.accountId,
    ),
    index("index_conversations_on_campaign_id").on(table.campaignId),
    index("index_conversations_on_contact_id").on(table.contactId),
    index("index_conversations_on_contact_inbox_id").on(table.contactInboxId),
    index("index_conversations_on_created_at").on(table.createdAt),
    index("index_conversations_on_first_reply_created_at").on(table.firstReplyCreatedAt),
    index("index_conversations_on_identifier_and_account_id").on(table.identifier, table.accountId),
    index("index_conversations_on_inbox_id").on(table.inboxId),
    index("index_conversations_on_priority").on(table.priority),
    index("index_conversations_on_status_and_account_id").on(table.status, table.accountId),
    index("index_conversations_on_status_and_priority").on(table.status, table.priority),
    index("index_conversations_on_team_id").on(table.teamId),
    uniqueIndex("index_conversations_on_uuid").on(table.uuid),
    index("index_conversations_on_waiting_since").on(table.waitingSince),
  ],
);

export const mentions = pgTable(
  "mentions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    mentionedAt: timestamp("mentioned_at").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_mentions_on_account_id").on(table.accountId),
    index("index_mentions_on_conversation_id").on(table.conversationId),
    uniqueIndex("index_mentions_on_user_id_and_conversation_id").on(
      table.userId,
      table.conversationId,
    ),
    index("index_mentions_on_user_id").on(table.userId),
  ],
);

export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Mention = typeof mentions.$inferSelect;
