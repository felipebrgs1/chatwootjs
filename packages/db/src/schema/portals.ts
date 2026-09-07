import {
  bigint,
  bigserial,
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

// Central de ajuda — espelha `portals`, `categories`, `folders` e `articles`.
// articles.status: 0 draft, 1 published.

export const portals = pgTable(
  "portals",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    customDomain: varchar("custom_domain", { length: 255 }),
    color: varchar("color", { length: 255 }),
    homepageLink: varchar("homepage_link", { length: 255 }),
    pageTitle: varchar("page_title", { length: 255 }),
    headerText: text("header_text"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_portals_on_slug").on(table.slug),
    index("index_portals_on_account_id").on(table.accountId),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    portalId: integer("portal_id")
      .notNull()
      .references(() => portals.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    locale: varchar("locale", { length: 32 }).notNull().default("pt-BR"),
    position: integer("position"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_categories_on_portal_id").on(table.portalId),
    index("index_categories_on_account_id").on(table.accountId),
  ],
);

export const folders = pgTable(
  "folders",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("index_folders_on_category_id").on(table.categoryId)],
);

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    portalId: integer("portal_id")
      .notNull()
      .references(() => portals.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    folderId: integer("folder_id").references(() => folders.id, { onDelete: "set null" }),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 500 }),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    content: text("content"),
    status: integer("status").notNull().default(0),
    views: integer("views").notNull().default(0),
    position: integer("position"),
    locale: varchar("locale", { length: 32 }).notNull().default("pt-BR"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_articles_on_portal_id_and_status").on(table.portalId, table.status),
    index("index_articles_on_account_id").on(table.accountId),
    index("index_articles_on_category_id").on(table.categoryId),
  ],
);

// D1 — membros de portal (join table SEM id, como no Rails) + categorias
// relacionadas. Espelha `chatwoot/db/schema.rb`. Sem FKs em D1 (D2 alinha).

export const portalsMembers = pgTable(
  "portals_members",
  {
    portalId: bigint("portal_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
  },
  (table) => [
    unique("index_portals_members_on_portal_id_and_user_id").on(table.portalId, table.userId),
    index("index_portals_members_on_portal_id").on(table.portalId),
    index("index_portals_members_on_user_id").on(table.userId),
  ],
);

export const relatedCategories = pgTable(
  "related_categories",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    categoryId: bigint("category_id", { mode: "number" }),
    relatedCategoryId: bigint("related_category_id", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
  },
  (table) => [
    unique("index_related_categories_on_category_id_and_related_category_id").on(
      table.categoryId,
      table.relatedCategoryId,
    ),
    unique("index_related_categories_on_related_category_id_and_category_id").on(
      table.relatedCategoryId,
      table.categoryId,
    ),
  ],
);

export type Portal = typeof portals.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type PortalsMember = typeof portalsMembers.$inferSelect;
export type RelatedCategory = typeof relatedCategories.$inferSelect;
