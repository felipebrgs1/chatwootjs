import "./env";

import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export function createDb(connectionString?: string) {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(url, { schema });
}

export const db = createDb();
