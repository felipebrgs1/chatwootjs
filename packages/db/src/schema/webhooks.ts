import {
  bigserial,
  integer,
  jsonb,
  text,
  timestamp,
  varchar,
  pgTable,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const integrationsHooks = pgTable("integrations_hooks", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  status: integer("status").default(1),
  inboxId: integer("inbox_id"),
  accountId: integer("account_id"),
  appId: varchar("app_id", { length: 255 }),
  hookType: integer("hook_type").default(0),
  referenceId: varchar("reference_id", { length: 255 }),
  accessToken: varchar("access_token", { length: 255 }),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
  settings: jsonb("settings").default({}),
});

export const webhooks = pgTable(
  "webhooks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id"),
    inboxId: integer("inbox_id"),
    url: text("url"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    webhookType: integer("webhook_type").default(0),
    subscriptions: jsonb("subscriptions").default([
      "conversation_status_changed",
      "conversation_updated",
      "conversation_created",
      "contact_created",
      "contact_updated",
      "message_created",
      "message_updated",
      "webwidget_triggered",
    ]),
    name: varchar("name", { length: 255 }),
    secret: varchar("secret", { length: 255 }),
  },
  (table) => [uniqueIndex("index_webhooks_on_account_id_and_url").on(table.accountId, table.url)],
);

export type IntegrationsHook = typeof integrationsHooks.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
