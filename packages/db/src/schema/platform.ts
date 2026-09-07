/**
 * M12 — Superadmin/Auditoria/AgentBots. Espelha `agent_bots`,
 * `agent_bot_inboxes`, `email_templates`, `platform_apps` e
 * `platform_banners` do `chatwoot/db/schema.rb` (nomes/colunas iguais).
 *
 * Auditoria usa tabela própria `audit_logs` (o Rails usa `audits` via gem
 * `audited`; nome nosso evita colisão e está documentado na spec M12).
 */
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

import { accounts, users } from "./auth";
import { inboxes } from "./inboxes";

export const agentBots = pgTable(
  "agent_bots",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }),
    description: varchar("description", { length: 255 }),
    outgoingUrl: varchar("outgoing_url", { length: 255 }),
    accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }),
    // bot_type: 0 webhook, 1 captain (IA).
    botType: integer("bot_type").notNull().default(0),
    botConfig: jsonb("bot_config").$type<Record<string, unknown>>().notNull().default({}),
    secret: varchar("secret", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("index_agent_bots_on_account_id").on(table.accountId)],
);

export const agentBotInboxes = pgTable(
  "agent_bot_inboxes",
  {
    id: serial("id").primaryKey(),
    inboxId: integer("inbox_id").references(() => inboxes.id, { onDelete: "cascade" }),
    agentBotId: integer("agent_bot_id").references(() => agentBots.id, { onDelete: "cascade" }),
    status: integer("status").notNull().default(0),
    accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("index_agent_bot_inboxes_on_inbox_id").on(table.inboxId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(),
    auditableType: varchar("auditable_type", { length: 100 }),
    auditableId: integer("auditable_id"),
    changes: jsonb("changes").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_audit_logs_on_account_id").on(table.accountId),
    index("index_audit_logs_on_auditable").on(table.auditableType, table.auditableId),
    index("index_audit_logs_on_user_id").on(table.userId),
  ],
);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    body: text("body").notNull(),
    accountId: integer("account_id").references(() => accounts.id, { onDelete: "cascade" }),
    templateType: integer("template_type").notNull().default(1),
    locale: integer("locale").notNull().default(0),
    inboxId: integer("inbox_id").references(() => inboxes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_email_templates_on_account_id").on(table.accountId),
    index("index_email_templates_on_inbox_id").on(table.inboxId),
  ],
);

export const platformApps = pgTable("platform_apps", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const platformBanners = pgTable("platform_banners", {
  id: serial("id").primaryKey(),
  bannerMessage: text("banner_message").notNull(),
  bannerType: integer("banner_type").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AgentBot = typeof agentBots.$inferSelect;
export type AgentBotInbox = typeof agentBotInboxes.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type PlatformApp = typeof platformApps.$inferSelect;
export type PlatformBanner = typeof platformBanners.$inferSelect;
