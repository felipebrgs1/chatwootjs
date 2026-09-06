import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (nomes snake_case no banco).
// Roles: account_users.role 0 = agent, 1 = administrator.
// Availability: 0 = online, 1 = busy, 2 = offline.

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  locale: varchar("locale", { length: 10 }).notNull().default("pt_BR"),
  status: integer("status").notNull().default(0),
  featureFlags: jsonb("feature_flags").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    // NULL até o convite ser aceito (devise_invitable comporta-se assim).
    name: text("name").notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordDigest: text("password_digest"),
    availabilityStatus: integer("availability_status").notNull().default(0),
    uiSettings: jsonb("ui_settings").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_availability_status_idx").on(table.availabilityStatus)],
);

export const accountUsers = pgTable(
  "account_users",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    role: integer("role").notNull().default(0),
    availabilityStatus: integer("availability_status").notNull().default(0),
    autoOffline: boolean("auto_offline").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("account_users_user_account_unique").on(table.userId, table.accountId),
    index("account_users_account_idx").on(table.accountId),
  ],
);

/**
 * Tokens opacos (refresh rotation, convites, reset de senha).
 * Guarda só o digest SHA-256; o segredo viaja uma única vez.
 * owner_type: 'refresh' | 'invitation' | 'password_reset'.
 */
export const accessTokens = pgTable(
  "access_tokens",
  {
    id: serial("id").primaryKey(),
    ownerType: text("owner_type").notNull(),
    ownerId: integer("owner_id").notNull(),
    tokenDigest: text("token_digest").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("access_tokens_owner_idx").on(table.ownerType, table.ownerId)],
);

export const superAdmins = pgTable("super_admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordDigest: text("password_digest").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const installationConfigs = pgTable("installation_configs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  value: jsonb("value"),
  locked: boolean("locked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Account = typeof accounts.$inferSelect;
export type User = typeof users.$inferSelect;
export type AccountUser = typeof accountUsers.$inferSelect;
export type AccessToken = typeof accessTokens.$inferSelect;
