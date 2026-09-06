import "./env";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export * from "./schema";

export function createDb(connectionString?: string): NodePgDatabase<typeof schema> {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(url, { schema });
}

export const db = createDb();
