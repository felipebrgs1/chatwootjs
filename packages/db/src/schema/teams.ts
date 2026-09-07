import {
  bigint,
  bigserial,
  boolean,
  text,
  timestamp,
  varchar,
  pgTable,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const teamMembers = pgTable(
  "team_members",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    teamId: bigint("team_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("index_team_members_on_team_id_and_user_id").on(table.teamId, table.userId),
    index("index_team_members_on_team_id").on(table.teamId),
    index("index_team_members_on_user_id").on(table.userId),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    allowAutoAssign: boolean("allow_auto_assign").default(true),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    icon: varchar("icon", { length: 255 }).default(""),
    iconColor: varchar("icon_color", { length: 255 }).default(""),
  },
  (table) => [
    index("index_teams_on_account_id").on(table.accountId),
    uniqueIndex("index_teams_on_name_and_account_id").on(table.name, table.accountId),
  ],
);

export type TeamMember = typeof teamMembers.$inferSelect;
export type Team = typeof teams.$inferSelect;
