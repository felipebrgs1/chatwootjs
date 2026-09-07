import { integer, pgTable, serial, unique, varchar } from "drizzle-orm/pg-core";

// D1 — `tags` (acts-as-taggable). O Rails tem `labels` + `tags` + `taggings`;
// aqui já existiam `labels` e `taggings` — faltava só `tags`. PK serial,
// como no `schema.rb`. O índice trigram em lower(name) vai em D2.

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }),
    taggingsCount: integer("taggings_count").default(0),
  },
  // Índice trigram em lower(name) (gin) — D2.
  (table) => [unique("index_tags_on_name").on(table.name)],
);

export type Tag = typeof tags.$inferSelect;
