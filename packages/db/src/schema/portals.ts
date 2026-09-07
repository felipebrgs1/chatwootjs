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

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const articles = pgTable(
  "articles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    portalId: integer("portal_id").notNull(),
    categoryId: integer("category_id"),
    folderId: integer("folder_id"),
    title: varchar("title", { length: 255 }),
    description: text("description"),
    content: text("content"),
    status: integer("status"),
    views: integer("views"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    authorId: bigint("author_id", { mode: "number" }),
    associatedArticleId: bigint("associated_article_id", { mode: "number" }),
    meta: jsonb("meta").default({}),
    slug: varchar("slug", { length: 255 }).notNull(),
    position: integer("position"),
    locale: varchar("locale", { length: 255 }).notNull().default("en"),
    draftTitle: varchar("draft_title", { length: 255 }),
    draftContent: text("draft_content"),
  },
  (table) => [
    index("index_articles_on_account_id").on(table.accountId),
    index("index_articles_on_associated_article_id").on(table.associatedArticleId),
    index("index_articles_on_author_id").on(table.authorId),
    index("index_articles_on_portal_id").on(table.portalId),
    uniqueIndex("index_articles_on_slug").on(table.slug),
    index("index_articles_on_status").on(table.status),
    index("index_articles_on_views").on(table.views),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    portalId: integer("portal_id").notNull(),
    name: varchar("name", { length: 255 }),
    description: text("description"),
    position: integer("position"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    locale: varchar("locale", { length: 255 }).default("en"),
    slug: varchar("slug", { length: 255 }).notNull(),
    parentCategoryId: bigint("parent_category_id", { mode: "number" }),
    associatedCategoryId: bigint("associated_category_id", { mode: "number" }),
    icon: varchar("icon", { length: 255 }).default(""),
    iconColor: varchar("icon_color", { length: 255 }).default(""),
  },
  (table) => [
    index("index_categories_on_associated_category_id").on(table.associatedCategoryId),
    index("index_categories_on_locale_and_account_id").on(table.locale, table.accountId),
    index("index_categories_on_locale").on(table.locale),
    index("index_categories_on_parent_category_id").on(table.parentCategoryId),
    uniqueIndex("index_categories_on_slug_and_locale_and_portal_id").on(
      table.slug,
      table.locale,
      table.portalId,
    ),
  ],
);

export const folders = pgTable("folders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  accountId: integer("account_id").notNull(),
  categoryId: integer("category_id").notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const portals = pgTable(
  "portals",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    customDomain: varchar("custom_domain", { length: 255 }),
    color: varchar("color", { length: 255 }),
    homepageLink: varchar("homepage_link", { length: 255 }),
    pageTitle: varchar("page_title", { length: 255 }),
    headerText: text("header_text"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    config: jsonb("config").default({ allowed_locales: ["en"] }),
    archived: boolean("archived").default(false),
    channelWebWidgetId: bigint("channel_web_widget_id", { mode: "number" }),
    sslSettings: jsonb("ssl_settings").notNull().default({}),
  },
  (table) => [
    index("index_portals_on_channel_web_widget_id").on(table.channelWebWidgetId),
    uniqueIndex("index_portals_on_custom_domain").on(table.customDomain),
    uniqueIndex("index_portals_on_slug").on(table.slug),
  ],
);

export const portalsMembers = pgTable(
  "portals_members",
  {
    portalId: bigint("portal_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("index_portals_members_on_portal_id_and_user_id").on(table.portalId, table.userId),
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
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("index_related_categories_on_category_id_and_related_category_id").on(
      table.categoryId,
      table.relatedCategoryId,
    ),
    uniqueIndex("index_related_categories_on_related_category_id_and_category_id").on(
      table.relatedCategoryId,
      table.categoryId,
    ),
  ],
);

export type Article = typeof articles.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type Portal = typeof portals.$inferSelect;
export type PortalsMember = typeof portalsMembers.$inferSelect;
export type RelatedCategory = typeof relatedCategories.$inferSelect;
