import {
  bigint,
  bigserial,
  integer,
  jsonb,
  timestamp,
  varchar,
  pgTable,
  index,
} from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const copilotMessages = pgTable(
  "copilot_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    copilotThreadId: bigint("copilot_thread_id", { mode: "number" }).notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    message: jsonb("message").notNull().default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    messageType: integer("message_type").default(0),
  },
  (table) => [
    index("index_copilot_messages_on_account_id").on(table.accountId),
    index("index_copilot_messages_on_copilot_thread_id").on(table.copilotThreadId),
  ],
);

export const copilotThreads = pgTable(
  "copilot_threads",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    assistantId: integer("assistant_id"),
  },
  (table) => [
    index("index_copilot_threads_on_account_id").on(table.accountId),
    index("index_copilot_threads_on_assistant_id").on(table.assistantId),
    index("index_copilot_threads_on_user_id").on(table.userId),
  ],
);

export type CopilotMessage = typeof copilotMessages.$inferSelect;
export type CopilotThread = typeof copilotThreads.$inferSelect;
