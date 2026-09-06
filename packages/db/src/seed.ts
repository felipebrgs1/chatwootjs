import "./env";

import {
  accountUsers,
  accounts,
  automationRules,
  cannedResponses,
  channelWebWidgets,
  contactInboxes,
  contacts,
  conversations,
  inboxMembers,
  inboxes,
  labels,
  macros,
  messages,
  superAdmins,
  teamMembers,
  teams,
  users,
} from "./schema";
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

  // ---- M2: inbox Website (widget) demo ----
  let inboxId = (
    await db.query.inboxes.findFirst({
      where: (i, { eq, and }) =>
        and(eq(i.accountId, accountId), eq(i.channelType, "Channel::WebWidget")),
    })
  )?.id;
  if (!inboxId) {
    const websiteToken = `demo_${crypto.randomUUID().replaceAll("-", "")}`.slice(0, 50);
    const [channel] = await db
      .insert(channelWebWidgets)
      .values({
        accountId,
        websiteUrl: "https://demo.test",
        websiteToken,
        welcomeTitle: "Olá!",
        welcomeTagline: "Como podemos ajudar?",
      })
      .returning({ id: channelWebWidgets.id });
    if (!channel) throw new Error("seed: channel_web_widget not created");
    const [inbox] = await db
      .insert(inboxes)
      .values({
        accountId,
        channelId: channel.id,
        channelType: "Channel::WebWidget",
        name: "Site Demo",
        greetingEnabled: true,
        greetingMessage: "Olá! Como podemos ajudar hoje?",
      })
      .returning({ id: inboxes.id });
    if (!inbox) throw new Error("seed: inbox not created");
    inboxId = inbox.id;
  }
  // Admin vê a inbox como membro; agente também (para o aceite de M2).
  await db.insert(inboxMembers).values({ inboxId, userId: adminId }).onConflictDoNothing();
  await db.insert(inboxMembers).values({ inboxId, userId: agentId }).onConflictDoNothing();

  // ---- M3: labels demo + contato de exemplo ----
  await db
    .insert(labels)
    .values([
      { accountId, title: "suporte", color: "#1f93ff", showOnSidebar: true },
      { accountId, title: "vendas", color: "#7b61ff", showOnSidebar: true },
      { accountId, title: "prioridade", color: "#ef4444", showOnSidebar: false },
    ])
    .onConflictDoNothing({ target: [labels.title, labels.accountId] });

  const demoContact = await db.query.contacts.findFirst({
    where: (ct, { eq, and }) =>
      and(eq(ct.accountId, accountId), eq(ct.email, "carla@cliente.test")),
  });
  let demoContactId = demoContact?.id;
  if (!demoContactId) {
    const [created] = await db
      .insert(contacts)
      .values({
        accountId,
        name: "Carla Souza",
        email: "carla@cliente.test",
        phoneNumber: "+5511999998888",
        location: "São Paulo, SP",
        additionalAttributes: { company_name: "Cliente Inc" },
      })
      .returning({ id: contacts.id });
    demoContactId = created?.id;
  }
  if (!demoContactId) throw new Error("seed: demo contact not found");

  // ---- M4: conversa demo (thread visível no dashboard) ----
  const existingConv = await db.query.conversations.findFirst({
    where: (cv, { eq, and }) => and(eq(cv.accountId, accountId), eq(cv.contactId, demoContactId)),
  });
  if (!existingConv) {
    const [conv] = await db
      .insert(conversations)
      .values({
        accountId,
        inboxId,
        contactId: demoContactId,
        displayId: 1,
        uuid: crypto.randomUUID(),
        status: 0,
        assigneeId: adminId,
        lastActivityAt: new Date(),
      })
      .returning({ id: conversations.id });
    if (conv) {
      await db.insert(contactInboxes).values({
        contactId: demoContactId,
        inboxId,
        sourceId: crypto.randomUUID(),
        pubsubToken: crypto.randomUUID(),
      });
      await db.insert(messages).values([
        {
          accountId,
          inboxId,
          conversationId: conv.id,
          messageType: 0,
          content: "Olá! Preciso de ajuda com meu pedido.",
          senderType: "Contact",
          senderId: demoContactId,
        },
        {
          accountId,
          inboxId,
          conversationId: conv.id,
          messageType: 1,
          content: "Olá Carla! Claro, como posso ajudar?",
          senderType: "User",
          senderId: adminId,
        },
      ]);
    }
  }

  // ---- Fase 6: time demo + respostas prontas + macro exemplo ----
  const demoTeam = await db.query.teams.findFirst({
    where: (t, { eq, and }) => and(eq(t.accountId, accountId), eq(t.name, "suporte")),
  });
  let demoTeamId = demoTeam?.id;
  if (!demoTeamId) {
    const [created] = await db
      .insert(teams)
      .values({ accountId, name: "suporte", description: "Atendimento geral" })
      .returning({ id: teams.id });
    demoTeamId = created?.id;
  }
  if (demoTeamId) {
    await db
      .insert(teamMembers)
      .values([
        { teamId: demoTeamId, userId: adminId },
        { teamId: demoTeamId, userId: agentId },
      ])
      .onConflictDoNothing();
  }

  await db
    .insert(cannedResponses)
    .values([
      { accountId, shortCode: "saudacao", content: "Olá! Como posso ajudar?" },
      { accountId, shortCode: "despedida", content: "Obrigado pelo contato! Até mais." },
    ])
    .onConflictDoNothing();

  const demoMacro = await db.query.macros.findFirst({
    where: (m, { eq, and }) => and(eq(m.accountId, accountId), eq(m.name, "Triagem urgente")),
  });
  if (!demoMacro && demoTeamId) {
    await db.insert(macros).values({
      accountId,
      name: "Triagem urgente",
      visibility: 1,
      createdById: adminId,
      updatedById: adminId,
      actions: [
        { action_name: "assign_team", action_params: [demoTeamId] },
        { action_name: "add_label", action_params: ["prioridade"] },
        { action_name: "change_priority", action_params: ["urgent"] },
      ],
    });
  }

  const demoRule = await db.query.automationRules.findFirst({
    where: (r, { eq, and }) => and(eq(r.accountId, accountId), eq(r.name, "Urgente via chat")),
  });
  if (!demoRule) {
    await db.insert(automationRules).values({
      accountId,
      name: "Urgente via chat",
      description: "Mensagem com 'urgente' ganha label + prioridade",
      eventName: "message_created",
      conditions: [{ attribute_key: "content", filter_operator: "contains", values: ["urgente"] }],
      actions: [
        { action_name: "add_label", action_params: ["prioridade"] },
        { action_name: "change_priority", action_params: ["urgent"] },
      ],
      active: true,
    });
  }

  console.log(`seed ok: account=Demo admin=${ADMIN_EMAIL} agent=${AGENT_EMAIL} (${PASSWORD})`);
}

await seed();
process.exit(0);
