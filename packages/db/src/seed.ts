import "./env";

import { accountUsers, accounts, superAdmins, users } from "./schema";
import { db } from "./index";

const ADMIN_EMAIL = "admin@demo.test";
const AGENT_EMAIL = "agent@demo.test";
const SUPERADMIN_EMAIL = "superadmin@demo.test";
const PASSWORD = "password123";

/**
 * Seed M1 — conta Demo com 1 admin + 1 agente, e 1 superadmin global.
 * Idempotente (ON CONFLICT DO NOTHING) — rode quantas vezes quiser.
 */
async function seed(): Promise<void> {
  const existing = await db.query.accounts.findFirst({
    where: (a, { eq }) => eq(a.name, "Demo"),
  });
  let accountId = existing?.id;
  if (!accountId) {
    const [created] = await db
      .insert(accounts)
      .values({ name: "Demo" })
      .returning({ id: accounts.id });
    accountId = created?.id;
  }
  if (!accountId) throw new Error("seed: Demo account not found");

  const passwordDigest = await Bun.password.hash(PASSWORD, { algorithm: "bcrypt", cost: 10 });

  const [admin] = await db
    .insert(users)
    .values({ name: "Ada Lovelace", email: ADMIN_EMAIL, passwordDigest })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  const adminId =
    admin?.id ??
    (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, ADMIN_EMAIL) }))?.id;
  if (!adminId) throw new Error("seed: demo admin not found");

  const [agent] = await db
    .insert(users)
    .values({ name: "Alan Turing", email: AGENT_EMAIL, passwordDigest })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  const agentId =
    agent?.id ??
    (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, AGENT_EMAIL) }))?.id;
  if (!agentId) throw new Error("seed: demo agent not found");

  await db
    .insert(accountUsers)
    .values({ userId: adminId, accountId, role: 1 })
    .onConflictDoNothing();
  await db
    .insert(accountUsers)
    .values({ userId: agentId, accountId, role: 0 })
    .onConflictDoNothing();

  const superDigest = await Bun.password.hash(PASSWORD, { algorithm: "bcrypt", cost: 10 });
  await db
    .insert(superAdmins)
    .values({ email: SUPERADMIN_EMAIL, passwordDigest: superDigest })
    .onConflictDoNothing();

  console.log(`seed ok: account=Demo admin=${ADMIN_EMAIL} agent=${AGENT_EMAIL} (${PASSWORD})`);
}

await seed();
process.exit(0);
