import {
  boolean,
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
import {
  channelApi,
  channelEmail,
  channelFacebookPages,
  channelInstagrams,
  channelLines,
  channelSms,
  channelTelegrams,
  channelTwitters,
  channelWebWidgets,
  channelWhatsapps,
} from "./channels";

// Inboxes — espelha chatwoot/db/schema.rb.
// channel_id + channel_type apontam para o row do canal correspondente.

export const inboxes = pgTable(
  "inboxes",
  {
    id: serial("id").primaryKey(),
    channelId: integer("channel_id").notNull(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    channelType: varchar("channel_type", { length: 255 }),
    enableAutoAssignment: boolean("enable_auto_assignment").notNull().default(true),
    greetingEnabled: boolean("greeting_enabled").notNull().default(false),
    greetingMessage: text("greeting_message"),
    emailAddress: varchar("email_address", { length: 255 }),
    workingHoursEnabled: boolean("working_hours_enabled").notNull().default(false),
    outOfOfficeMessage: text("out_of_office_message"),
    timezone: varchar("timezone", { length: 255 }).notNull().default("UTC"),
    enableEmailCollect: boolean("enable_email_collect").notNull().default(true),
    csatSurveyEnabled: boolean("csat_survey_enabled").notNull().default(false),
    allowMessagesAfterResolved: boolean("allow_messages_after_resolved").notNull().default(true),
    autoAssignmentConfig: jsonb("auto_assignment_config").notNull().default({}),
    lockToSingleConversation: boolean("lock_to_single_conversation").notNull().default(false),
    senderNameType: integer("sender_name_type").notNull().default(0),
    businessName: varchar("business_name", { length: 255 }),
    csatConfig: jsonb("csat_config").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_inboxes_on_account_id").on(table.accountId),
    index("index_inboxes_on_channel_id_and_channel_type").on(table.channelId, table.channelType),
  ],
);

export type Inbox = typeof inboxes.$inferSelect;

/** channel_type → tabela Drizzle correspondente. */
export const CHANNEL_TABLES = {
  "Channel::WebWidget": channelWebWidgets,
  "Channel::Api": channelApi,
  "Channel::Email": channelEmail,
  "Channel::FacebookPage": channelFacebookPages,
  "Channel::Instagram": channelInstagrams,
  "Channel::TwitterProfile": channelTwitters,
  "Channel::Telegram": channelTelegrams,
  "Channel::Whatsapp": channelWhatsapps,
  "Channel::Sms": channelSms,
  "Channel::Line": channelLines,
} as const;

export type ChannelType = keyof typeof CHANNEL_TABLES;
