import {
  bigint,
  bigserial,
  boolean,
  integer,
  json,
  jsonb,
  serial,
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

export const accessTokens = pgTable(
  "access_tokens",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ownerType: varchar("owner_type", { length: 255 }),
    ownerId: bigint("owner_id", { mode: "number" }),
    token: varchar("token", { length: 255 }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_access_tokens_on_owner_type_and_owner_id").on(table.ownerType, table.ownerId),
    uniqueIndex("index_access_tokens_on_token").on(table.token),
  ],
);

export const accountSamlSettings = pgTable(
  "account_saml_settings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    ssoUrl: varchar("sso_url", { length: 255 }),
    certificate: text("certificate"),
    spEntityId: varchar("sp_entity_id", { length: 255 }),
    idpEntityId: varchar("idp_entity_id", { length: 255 }),
    roleMappings: json("role_mappings").default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("index_account_saml_settings_on_account_id").on(table.accountId)],
);

export const accountUsers = pgTable(
  "account_users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }),
    userId: bigint("user_id", { mode: "number" }),
    role: integer("role").default(0),
    inviterId: bigint("inviter_id", { mode: "number" }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    activeAt: timestamp("active_at"),
    availabilityStatus: integer("availability").notNull().default(0),
    autoOffline: boolean("auto_offline").notNull().default(true),
    customRoleId: bigint("custom_role_id", { mode: "number" }),
    agentCapacityPolicyId: bigint("agent_capacity_policy_id", { mode: "number" }),
  },
  (table) => [
    uniqueIndex("uniq_user_id_per_account_id").on(table.accountId, table.userId),
    index("index_account_users_on_account_id").on(table.accountId),
    index("index_account_users_on_agent_capacity_policy_id").on(table.agentCapacityPolicyId),
    index("index_account_users_on_custom_role_id").on(table.customRoleId),
    index("index_account_users_on_user_id").on(table.userId),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    locale: integer("locale").default(0),
    domain: varchar("domain", { length: 100 }),
    supportEmail: varchar("support_email", { length: 100 }),
    // Bitmask (63 flags, bit 61+ estoura Number) — mode bigint preserva os bits.
    featureFlags: bigint("feature_flags", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    autoResolveDuration: integer("auto_resolve_duration"),
    limits: jsonb("limits").default({}),
    customAttributes: jsonb("custom_attributes").default({}),
    status: integer("status").default(0),
    internalAttributes: jsonb("internal_attributes").notNull().default({}),
    settings: jsonb("settings").default({}),
    featureFlagsExt1: bigint("feature_flags_ext_1", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
  },
  (table) => [index("index_accounts_on_status").on(table.status)],
);

export const installationConfigs = pgTable(
  "installation_configs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    serializedValue: jsonb("serialized_value").notNull().default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    locked: boolean("locked").notNull().default(true),
  },
  (table) => [
    uniqueIndex("index_installation_configs_on_name_and_created_at").on(
      table.name,
      table.createdAt,
    ),
    uniqueIndex("index_installation_configs_on_name").on(table.name),
  ],
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    clientId: varchar("client_id", { length: 255 }).notNull(),
    ipAddress: varchar("ip_address", { length: 255 }),
    userAgent: varchar("user_agent", { length: 255 }),
    browserName: varchar("browser_name", { length: 255 }),
    browserVersion: varchar("browser_version", { length: 255 }),
    deviceName: varchar("device_name", { length: 255 }),
    platformName: varchar("platform_name", { length: 255 }),
    platformVersion: varchar("platform_version", { length: 255 }),
    city: varchar("city", { length: 255 }),
    country: varchar("country", { length: 255 }),
    countryCode: varchar("country_code", { length: 255 }),
    lastActivityAt: timestamp("last_activity_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("index_user_sessions_on_user_id_and_client_id").on(table.userId, table.clientId),
    index("index_user_sessions_on_user_id").on(table.userId),
  ],
);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    provider: varchar("provider", { length: 255 }).notNull().default("email"),
    uid: varchar("uid", { length: 255 }).notNull().default(""),
    passwordDigest: varchar("encrypted_password", { length: 255 }).notNull().default(""),
    resetPasswordToken: varchar("reset_password_token", { length: 255 }),
    resetPasswordSentAt: timestamp("reset_password_sent_at"),
    rememberCreatedAt: timestamp("remember_created_at"),
    signInCount: integer("sign_in_count").notNull().default(0),
    currentSignInAt: timestamp("current_sign_in_at"),
    lastSignInAt: timestamp("last_sign_in_at"),
    currentSignInIp: varchar("current_sign_in_ip", { length: 255 }),
    lastSignInIp: varchar("last_sign_in_ip", { length: 255 }),
    confirmationToken: varchar("confirmation_token", { length: 255 }),
    confirmedAt: timestamp("confirmed_at"),
    confirmationSentAt: timestamp("confirmation_sent_at"),
    unconfirmedEmail: varchar("unconfirmed_email", { length: 255 }),
    name: varchar("name", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    tokens: json("tokens"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    pubsubToken: varchar("pubsub_token", { length: 255 }),
    availabilityStatus: integer("availability").default(0),
    uiSettings: jsonb("ui_settings").default({}),
    customAttributes: jsonb("custom_attributes").default({}),
    type: varchar("type", { length: 255 }),
    messageSignature: text("message_signature"),
    otpSecret: varchar("otp_secret", { length: 255 }),
    consumedTimestep: integer("consumed_timestep"),
    otpRequiredForLogin: boolean("otp_required_for_login").default(false),
    otpBackupCodes: text("otp_backup_codes"),
  },
  (table) => [
    index("index_users_on_email").on(table.email),
    index("index_users_on_otp_required_for_login").on(table.otpRequiredForLogin),
    uniqueIndex("index_users_on_otp_secret").on(table.otpSecret),
    uniqueIndex("index_users_on_pubsub_token").on(table.pubsubToken),
    uniqueIndex("index_users_on_reset_password_token").on(table.resetPasswordToken),
    uniqueIndex("index_users_on_uid_and_provider").on(table.uid, table.provider),
  ],
);

// Tabela só nossa (drift-permitido): console superadmin local.
export const superAdmins = pgTable("super_admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordDigest: text("password_digest").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AccessToken = typeof accessTokens.$inferSelect;
export type AccountSamlSettings = typeof accountSamlSettings.$inferSelect;
export type AccountUser = typeof accountUsers.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type InstallationConfigs = typeof installationConfigs.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type User = typeof users.$inferSelect;
export type SuperAdmin = typeof superAdmins.$inferSelect;
