import "./env";

import { sql } from "drizzle-orm";

import { db } from "./index";

/**
 * Seed M0 — tabelas base (accounts/users/account_users) via SQL idempotente.
 * As colunas espelham a spec M1; no M1 este arquivo passa a usar o schema
 * Drizzle + dados de conteúdo (inboxes, contatos, conversas) entram em M2–M4.
 */
async function ensureBaseTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      locale VARCHAR(10) NOT NULL DEFAULT 'pt_BR',
      status INTEGER NOT NULL DEFAULT 0,
      feature_flags JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_digest TEXT NOT NULL,
      availability_status INTEGER NOT NULL DEFAULT 0,
      ui_settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS account_users (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      role INTEGER NOT NULL DEFAULT 0,
      availability_status INTEGER NOT NULL DEFAULT 0,
      auto_offline BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, account_id)
    );
  `);
}

async function seed(): Promise<void> {
  await ensureBaseTables();

  await db.execute(sql`
    INSERT INTO accounts (name) VALUES ('Demo')
    ON CONFLICT DO NOTHING;
  `);
  const accountRows = (await db.execute(sql`SELECT id FROM accounts WHERE name = 'Demo' LIMIT 1;`))
    .rows as Array<{ id: number }>;
  const accountId = accountRows[0]?.id;
  if (!accountId) throw new Error("seed: Demo account not found");

  const passwordDigest = await Bun.password.hash("password123", { algorithm: "bcrypt", cost: 10 });
  await db.execute(sql`
    INSERT INTO users (name, email, password_digest)
    VALUES ('Admin Demo', 'admin@demo.test', ${passwordDigest})
    ON CONFLICT (email) DO NOTHING;
  `);
  const userRows = (
    await db.execute(sql`SELECT id FROM users WHERE email = 'admin@demo.test' LIMIT 1;`)
  ).rows as Array<{ id: number }>;
  const userId = userRows[0]?.id;
  if (!userId) throw new Error("seed: demo admin not found");

  await db.execute(sql`
    INSERT INTO account_users (user_id, account_id, role)
    VALUES (${userId}, ${accountId}, 1)
    ON CONFLICT (user_id, account_id) DO NOTHING;
  `);

  console.log("seed ok: account=Demo admin=admin@demo.test password=password123");
}

await seed();
process.exit(0);
