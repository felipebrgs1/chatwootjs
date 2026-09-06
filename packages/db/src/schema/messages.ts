import {
  boolean,
  real,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./auth";
import { contacts } from "./contacts";
import { conversations } from "./conversations";
import { inboxes } from "./inboxes";

// Mensagens + anexos + CSAT — espelha chatwoot/db/schema.rb.
// message_type: 0 incoming, 1 outgoing, 2 activity, 3 template.
// content_type: 0 text, 1 input_text? (ver Messages::MessageBuilder — aqui:
//   0 text, 1 input_text, 2 input_textarea, 3 input_email, 4 input_select,
//   5 cards, 6 form, 7 article, 8 incoming_email, 9 input_csat).
// status: 0 sent, 1 delivered, 2 read, 3 failed.

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    content: text("content"),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    inboxId: integer("inbox_id")
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    messageType: integer("message_type").notNull(),
    private: boolean("private").notNull().default(false),
    status: integer("status").notNull().default(0),
    sourceId: text("source_id"),
    contentType: integer("content_type").notNull().default(0),
    contentAttributes: jsonb("content_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    senderType: varchar("sender_type", { length: 255 }),
    senderId: integer("sender_id"),
    externalSourceIds: jsonb("external_source_ids")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    additionalAttributes: jsonb("additional_attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    processedMessageContent: text("processed_message_content"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_messages_on_conversation_id").on(table.conversationId),
    index("index_messages_on_conversation_account_type_created").on(
      table.conversationId,
      table.accountId,
      table.messageType,
      table.createdAt,
    ),
    index("index_messages_on_account_id_and_inbox_id").on(table.accountId, table.inboxId),
    index("index_messages_on_sender_type_and_sender_id").on(table.senderType, table.senderId),
    index("index_messages_on_source_id").on(table.sourceId),
  ],
);

/** file_type: 0 image, 1 audio, 2 video, 3 file. */
export const attachments = pgTable(
  "attachments",
  {
    id: serial("id").primaryKey(),
    fileType: integer("file_type").notNull().default(0),
    externalUrl: varchar("external_url", { length: 1024 }),
    coordinatesLat: real("coordinates_lat").notNull().default(0),
    coordinatesLong: real("coordinates_long").notNull().default(0),
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    fallbackTitle: varchar("fallback_title", { length: 1024 }),
    extension: varchar("extension", { length: 64 }),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_attachments_on_account_id").on(table.accountId),
    index("index_attachments_on_message_id").on(table.messageId),
  ],
);

export const csatSurveyResponses = pgTable(
  "csat_survey_responses",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    feedbackMessage: text("feedback_message"),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    assignedAgentId: integer("assigned_agent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_csat_survey_responses_on_account_id").on(table.accountId),
    index("index_csat_survey_responses_on_conversation_id").on(table.conversationId),
    index("index_csat_survey_responses_on_message_id").on(table.messageId),
  ],
);

export type Message = typeof messages.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type CsatSurveyResponse = typeof csatSurveyResponses.$inferSelect;
