import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

// D1 — Chamadas de voz/vídeo. Espelha `calls` do `chatwoot/db/schema.rb`.
// Sem FKs em D1 (D2 alinha).

const ts = (name: string) => timestamp(name, { withTimezone: false });

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
    startedAt: ts("started_at"),
    durationSeconds: integer("duration_seconds"),
    endReason: varchar("end_reason", { length: 255 }),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
    transcript: text("transcript"),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    index("index_calls_on_account_id_and_contact_id").on(table.accountId, table.contactId),
    index("index_calls_on_account_id_and_conversation_id").on(
      table.accountId,
      table.conversationId,
    ),
    index("index_calls_on_account_id_and_created_at").on(table.accountId, table.createdAt),
    index("index_calls_on_message_id").on(table.messageId),
    unique("index_calls_on_provider_and_provider_call_id").on(table.provider, table.providerCallId),
  ],
);

export type Call = typeof calls.$inferSelect;
