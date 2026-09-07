import {
  bigint,
  bigserial,
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  varchar,
  pgTable,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const agentBotInboxes = pgTable("agent_bot_inboxes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  inboxId: integer("inbox_id"),
  agentBotId: integer("agent_bot_id"),
  status: integer("status").default(0),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
  accountId: integer("account_id"),
});

export const agentBots = pgTable(
  "agent_bots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }),
    description: varchar("description", { length: 255 }),
    outgoingUrl: varchar("outgoing_url", { length: 255 }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    accountId: bigint("account_id", { mode: "number" }),
    botType: integer("bot_type").default(0),
    botConfig: jsonb("bot_config").default({}),
    secret: varchar("secret", { length: 255 }),
  },
  (table) => [index("index_agent_bots_on_account_id").on(table.accountId)],
);

export const audits = pgTable(
  "audits",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    auditableId: bigint("auditable_id", { mode: "number" }),
    auditableType: varchar("auditable_type", { length: 255 }),
    associatedId: bigint("associated_id", { mode: "number" }),
    associatedType: varchar("associated_type", { length: 255 }),
    userId: bigint("user_id", { mode: "number" }),
    userType: varchar("user_type", { length: 255 }),
    username: varchar("username", { length: 255 }),
    action: varchar("action", { length: 255 }),
    auditedChanges: jsonb("audited_changes"),
    version: integer("version").default(0),
    comment: varchar("comment", { length: 255 }),
    remoteAddress: varchar("remote_address", { length: 255 }),
    requestUuid: varchar("request_uuid", { length: 255 }),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("index_audits_on_associated_and_created_at").on(
      table.associatedType,
      table.associatedId,
      table.createdAt,
    ),
    index("associated_index").on(table.associatedType, table.associatedId),
    index("auditable_index").on(table.auditableType, table.auditableId, table.version),
    index("index_audits_on_created_at").on(table.createdAt),
    index("index_audits_on_request_uuid").on(table.requestUuid),
    index("user_index").on(table.userId, table.userType),
  ],
);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    body: text("body").notNull(),
    accountId: integer("account_id"),
    templateType: integer("template_type").default(1),
    locale: integer("locale").notNull().default(0),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    inboxId: integer("inbox_id"),
  },
  (table) => [
    uniqueIndex("index_email_templates_on_account_scope")
      .on(table.accountId, table.name, table.templateType, table.locale)
      .where(sql`(account_id IS NOT NULL) AND (inbox_id IS NULL)`),
    uniqueIndex("index_email_templates_on_inbox_scope")
      .on(table.inboxId, table.name, table.templateType, table.locale)
      .where(sql`(inbox_id IS NOT NULL)`),
    index("index_email_templates_on_inbox_id").on(table.inboxId),
    uniqueIndex("index_email_templates_on_installation_scope")
      .on(table.name, table.templateType, table.locale)
      .where(sql`(account_id IS NULL) AND (inbox_id IS NULL)`),
  ],
);

export const platformAppPermissibles = pgTable(
  "platform_app_permissibles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    platformAppId: bigint("platform_app_id", { mode: "number" }).notNull(),
    permissibleType: varchar("permissible_type", { length: 255 }).notNull(),
    permissibleId: bigint("permissible_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_platform_app_permissibles_on_permissibles").on(
      table.permissibleType,
      table.permissibleId,
    ),
    uniqueIndex("unique_permissibles_index").on(
      table.platformAppId,
      table.permissibleId,
      table.permissibleType,
    ),
    index("index_platform_app_permissibles_on_platform_app_id").on(table.platformAppId),
  ],
);

export const platformApps = pgTable("platform_apps", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const platformBanners = pgTable("platform_banners", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  bannerMessage: text("banner_message").notNull(),
  bannerType: integer("banner_type").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export type AgentBotInbox = typeof agentBotInboxes.$inferSelect;
export type AgentBot = typeof agentBots.$inferSelect;
export type Audit = typeof audits.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type PlatformAppPermissibles = typeof platformAppPermissibles.$inferSelect;
export type PlatformApp = typeof platformApps.$inferSelect;
export type PlatformBanner = typeof platformBanners.$inferSelect;
export type AuditLog = Audit;
