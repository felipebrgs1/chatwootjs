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

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const calls = pgTable(
  "calls",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    inboxId: bigint("inbox_id", { mode: "number" }).notNull(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    contactId: bigint("contact_id", { mode: "number" }).notNull(),
    messageId: bigint("message_id", { mode: "number" }),
    acceptedByAgentId: bigint("accepted_by_agent_id", { mode: "number" }),
    providerCallId: varchar("provider_call_id", { length: 255 }).notNull(),
    provider: integer("provider").notNull().default(0),
    direction: integer("direction").notNull(),
    status: varchar("status", { length: 255 }).notNull().default("ringing"),
    startedAt: timestamp("started_at"),
    durationSeconds: integer("duration_seconds"),
    endReason: varchar("end_reason", { length: 255 }),
    meta: jsonb("meta").default({}),
    transcript: text("transcript"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_calls_on_account_id_and_contact_id").on(table.accountId, table.contactId),
    index("index_calls_on_account_id_and_conversation_id").on(
      table.accountId,
      table.conversationId,
    ),
    index("index_calls_on_account_id_and_created_at").on(table.accountId, table.createdAt),
    index("index_calls_on_message_id").on(table.messageId),
    uniqueIndex("index_calls_on_provider_and_provider_call_id").on(
      table.provider,
      table.providerCallId,
    ),
  ],
);

export type Call = typeof calls.$inferSelect;
