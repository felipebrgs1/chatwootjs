import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// D1 — Copilot (threads e mensagens). Espelha `chatwoot/db/schema.rb`.
// Sem FKs em D1 (D2 alinha).

const ts = (name: string) => timestamp(name, { withTimezone: false });

export const copilotThreads = pgTable(
  "copilot_threads",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    assistantId: integer("assistant_id"),
  },
  (table) => [
    index("index_copilot_threads_on_account_id").on(table.accountId),
    index("index_copilot_threads_on_assistant_id").on(table.assistantId),
    index("index_copilot_threads_on_user_id").on(table.userId),
  ],
);

export const copilotMessages = pgTable(
  "copilot_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    copilotThreadId: bigint("copilot_thread_id", { mode: "number" }).notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    message: jsonb("message").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    messageType: integer("message_type").default(0),
  },
  (table) => [
    index("index_copilot_messages_on_account_id").on(table.accountId),
    index("index_copilot_messages_on_copilot_thread_id").on(table.copilotThreadId),
  ],
);

export type CopilotThread = typeof copilotThreads.$inferSelect;
export type CopilotMessage = typeof copilotMessages.$inferSelect;
