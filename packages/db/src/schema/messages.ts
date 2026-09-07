import {
  bigint,
  bigserial,
  boolean,
  doublePrecision,
  integer,
  json,
  jsonb,
  serial,
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

export const attachments = pgTable(
  "attachments",
  {
    id: serial("id").primaryKey(),
    fileType: integer("file_type").default(0),
    externalUrl: varchar("external_url", { length: 255 }),
    coordinatesLat: doublePrecision("coordinates_lat").default(0.0),
    coordinatesLong: doublePrecision("coordinates_long").default(0.0),
    messageId: integer("message_id").notNull(),
    accountId: integer("account_id").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    fallbackTitle: varchar("fallback_title", { length: 255 }),
    extension: varchar("extension", { length: 255 }),
    meta: jsonb("meta").default({}),
  },
  (table) => [
    index("index_attachments_on_account_id").on(table.accountId),
    index("index_attachments_on_message_id").on(table.messageId),
  ],
);

export const csatSurveyResponses = pgTable(
  "csat_survey_responses",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    messageId: bigint("message_id", { mode: "number" }).notNull(),
    rating: integer("rating").notNull(),
    feedbackMessage: text("feedback_message"),
    contactId: bigint("contact_id", { mode: "number" }).notNull(),
    assignedAgentId: bigint("assigned_agent_id", { mode: "number" }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    csatReviewNotes: text("csat_review_notes"),
    reviewNotesUpdatedAt: timestamp("review_notes_updated_at"),
    reviewNotesUpdatedById: bigint("review_notes_updated_by_id", { mode: "number" }),
  },
  (table) => [
    index("index_csat_survey_responses_on_account_id").on(table.accountId),
    index("index_csat_survey_responses_on_assigned_agent_id").on(table.assignedAgentId),
    index("index_csat_survey_responses_on_contact_id").on(table.contactId),
    index("index_csat_survey_responses_on_conversation_id").on(table.conversationId),
    uniqueIndex("index_csat_survey_responses_on_message_id").on(table.messageId),
    index("index_csat_survey_responses_on_review_notes_updated_by_id").on(
      table.reviewNotesUpdatedById,
    ),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    content: text("content"),
    accountId: integer("account_id").notNull(),
    inboxId: integer("inbox_id").notNull(),
    conversationId: integer("conversation_id").notNull(),
    messageType: integer("message_type").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    private: boolean("private").notNull().default(false),
    status: integer("status").default(0),
    sourceId: text("source_id"),
    contentType: integer("content_type").notNull().default(0),
    contentAttributes: json("content_attributes").default({}),
    senderType: varchar("sender_type", { length: 255 }),
    senderId: bigint("sender_id", { mode: "number" }),
    externalSourceIds: jsonb("external_source_ids").default({}),
    additionalAttributes: jsonb("additional_attributes").default({}),
    processedMessageContent: text("processed_message_content"),
    sentiment: jsonb("sentiment").default({}),
  },
  (table) => [
    index("index_messages_on_additional_attributes_campaign_id").using(
      "gin",
      sql`((additional_attributes -> 'campaign_id'::text))`,
    ),
    index("idx_messages_account_content_created").on(
      table.accountId,
      table.contentType,
      table.createdAt,
    ),
    index("index_messages_on_account_created_type").on(
      table.accountId,
      table.createdAt,
      table.messageType,
    ),
    index("index_messages_on_account_id_and_inbox_id").on(table.accountId, table.inboxId),
    index("index_messages_on_account_id").on(table.accountId),
    index("index_messages_on_content").using("gin", sql`"content" gin_trgm_ops`),
    index("index_messages_on_conversation_account_type_created").on(
      table.conversationId,
      table.accountId,
      table.messageType,
      table.createdAt,
    ),
    index("index_messages_on_conversation_id").on(table.conversationId),
    index("index_messages_on_created_at").on(table.createdAt),
    index("index_messages_on_inbox_id").on(table.inboxId),
    index("index_messages_on_sender_and_created").on(
      table.senderType,
      table.senderId,
      table.createdAt,
    ),
    index("index_messages_on_sender_type_and_sender_id").on(table.senderType, table.senderId),
    index("index_messages_on_source_id").on(table.sourceId),
  ],
);

export type Attachment = typeof attachments.$inferSelect;
export type CsatSurveyResponse = typeof csatSurveyResponses.$inferSelect;
export type Message = typeof messages.$inferSelect;
