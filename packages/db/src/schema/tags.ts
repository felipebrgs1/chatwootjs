import { integer, serial, varchar, pgTable, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }),
    taggingsCount: integer("taggings_count").default(0),
  },
  (table) => [
    index("tags_name_trgm_idx").using("gin", sql`lower((name)::text) gin_trgm_ops`),
    uniqueIndex("index_tags_on_name").on(table.name),
  ],
);

export type Tag = typeof tags.$inferSelect;
