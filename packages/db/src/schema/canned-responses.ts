import { integer, serial, text, timestamp, varchar, pgTable } from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const cannedResponses = pgTable("canned_responses", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  shortCode: varchar("short_code", { length: 255 }),
  content: text("content"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export type CannedResponse = typeof cannedResponses.$inferSelect;
