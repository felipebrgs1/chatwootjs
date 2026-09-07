import {
  bigint,
  boolean,
  integer,
  jsonb,
  serial,
  timestamp,
  varchar,
  pgTable,
  index,
} from "drizzle-orm/pg-core";
import { portals } from "./portals";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const inboxes = pgTable(
  "inboxes",
  {
    id: serial("id").primaryKey(),
    channelId: integer("channel_id").notNull(),
    accountId: integer("account_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    channelType: varchar("channel_type", { length: 255 }),
    enableAutoAssignment: boolean("enable_auto_assignment").default(true),
    greetingEnabled: boolean("greeting_enabled").default(false),
    greetingMessage: varchar("greeting_message", { length: 255 }),
    emailAddress: varchar("email_address", { length: 255 }),
    workingHoursEnabled: boolean("working_hours_enabled").default(false),
    outOfOfficeMessage: varchar("out_of_office_message", { length: 255 }),
    timezone: varchar("timezone", { length: 255 }).default("UTC"),
    enableEmailCollect: boolean("enable_email_collect").default(true),
    csatSurveyEnabled: boolean("csat_survey_enabled").default(false),
    allowMessagesAfterResolved: boolean("allow_messages_after_resolved").default(true),
    autoAssignmentConfig: jsonb("auto_assignment_config").default({}),
    lockToSingleConversation: boolean("lock_to_single_conversation").notNull().default(false),
    portalId: bigint("portal_id", { mode: "number" }).references(() => portals.id),
    senderNameType: integer("sender_name_type").notNull().default(0),
    businessName: varchar("business_name", { length: 255 }),
    csatConfig: jsonb("csat_config").notNull().default({}),
  },
  (table) => [
    index("index_inboxes_on_account_id").on(table.accountId),
    index("index_inboxes_on_channel_id_and_channel_type").on(table.channelId, table.channelType),
    index("index_inboxes_on_portal_id").on(table.portalId),
  ],
);

export type Inbox = typeof inboxes.$inferSelect;
