import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts, users } from "./auth";

// Teams — espelha chatwoot/db/schema.rb (tabelas `teams`, `team_members`).

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    allowAutoAssign: boolean("allow_auto_assign").notNull().default(true),
    icon: varchar("icon", { length: 255 }).notNull().default(""),
    iconColor: varchar("icon_color", { length: 255 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_teams_on_name_and_account_id").on(table.name, table.accountId),
    index("index_teams_on_account_id").on(table.accountId),
  ],
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_team_members_on_team_id_and_user_id").on(table.teamId, table.userId),
    index("index_team_members_on_team_id").on(table.teamId),
    index("index_team_members_on_user_id").on(table.userId),
  ],
);

export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
