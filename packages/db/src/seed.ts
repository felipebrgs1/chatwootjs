import "./env";

import {
  accountUsers,
  accounts,
  articles,
  automationRules,
  cannedResponses,
  categories,
  channelApi,
  channelWebWidgets,
  contactInboxes,
  contacts,
  conversations,
  csatSurveyResponses,
  inboxMembers,
  inboxes,
  labels,
  macros,
  messages,
  notificationSettings,
  notifications,
  campaigns,
  portals,
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
  // D3: após um import do Chatwoot o banco já tem dados — seed pula sozinho
  // (SEED_FORCE=1 força a criação da conta Demo mesmo assim).
  if (process.env.SEED_FORCE !== "1") {
    const anyAccount = await db.query.accounts.findFirst();
    if (anyAccount && anyAccount.name !== "Demo") {
      console.log(
        `seed: banco já contém dados (conta "${anyAccount.name}") — provavelmente import D3; pulando. SEED_FORCE=1 para forçar.`,
      );
      return;
    }
  }
  const existing = await db.query.accounts.findFirst({
    where: (a, { eq }) => eq(a.name, "Demo"),
  });
  let accountId = existing?.id;
  if (!accountId) {
    // Rails: before_create :enable_default_features. Bits gerados de
    // chatwoot/config/features.yml por packages/core/src/lib/feature-flags.ts
    // (defaultFeatureFlags()); regenerar ao repinar o Chatwoot.
    const [created] = await db
      .insert(accounts)
      .values({
        name: "Demo",
        featureFlags: 1442282865939709831n,
        featureFlagsExt1: 4n,
      })
      .returning({ id: accounts.id });
    accountId = created?.id;
  }
  if (!accountId) throw new Error("seed: Demo account not found");

  const passwordDigest = await Bun.password.hash(PASSWORD, { algorithm: "bcrypt", cost: 10 });

  // Rails não tem índice unique em users.email: idempotência via lookup (sem ON CONFLICT).
  async function ensureUser(name: string, email: string): Promise<number> {
    const found = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) });
    if (found) return found.id;
    const [created] = await db
      .insert(users)
      // Rails/Devise: provider=email + uid=email (unique juntos).
      .values({ name, email, passwordDigest, provider: "email", uid: email })
      .onConflictDoNothing()
      .returning({ id: users.id });
    const id =
      created?.id ??
      (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) }))?.id;
    if (!id) throw new Error(`seed: user ${email} not found`);
    return id;
  }

  const adminId = await ensureUser("Ada Lovelace", ADMIN_EMAIL);
  const agentId = await ensureUser("Alan Turing", AGENT_EMAIL);

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
  // Demo: a admin da conta também é superadmin — assim o atalho
  // "Painel superadmin" aparece no menu do perfil dela.
  await db
    .insert(superAdmins)
    .values({ email: ADMIN_EMAIL, passwordDigest: superDigest })
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

  for (const canned of [
    { shortCode: "saudacao", content: "Olá! Como posso ajudar?" },
    { shortCode: "despedida", content: "Obrigado pelo contato! Até mais." },
  ]) {
    const found = await db.query.cannedResponses.findFirst({
      where: (r, { eq, and }) => and(eq(r.accountId, accountId), eq(r.shortCode, canned.shortCode)),
    });
    if (!found) {
      await db.insert(cannedResponses).values({ accountId, ...canned });
    }
  }

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

  // ---- M7–M9: campanha ongoing demo + portal demo (idempotentes) ----
  const demoCampaign = await db.query.campaigns.findFirst({
    where: (c, { eq, and }) => and(eq(c.accountId, accountId), eq(c.title, "Boas-vindas")),
  });
  if (!demoCampaign) {
    // Rails: campaigns.display_id NOT NULL sem default (sequência por conta).
    const maxDisplay = await db.query.campaigns.findFirst({
      where: (c, { eq }) => eq(c.accountId, accountId),
      orderBy: (c, { desc }) => desc(c.displayId),
      columns: { displayId: true },
    });
    await db.insert(campaigns).values({
      accountId,
      inboxId,
      displayId: (maxDisplay?.displayId ?? 0) + 1,
      title: "Boas-vindas",
      message: "Aproveite 10% off na primeira compra!",
      campaignType: 0,
      campaignStatus: 0,
      triggerRules: { time_on_page: 20 },
      audience: {},
      senderId: adminId,
    });
  }

  const demoPortal = await db.query.portals.findFirst({
    where: (p, { eq, and }) => and(eq(p.accountId, accountId), eq(p.slug, "ajuda")),
  });
  let demoPortalId = demoPortal?.id;
  if (!demoPortalId) {
    const [created] = await db
      .insert(portals)
      .values({
        accountId,
        name: "Ajuda",
        slug: "ajuda",
        color: "#1f93ff",
        pageTitle: "Central de Ajuda",
        headerText: "Como podemos ajudar?",
      })
      .returning({ id: portals.id });
    demoPortalId = created?.id;
  }
  if (demoPortalId) {
    let catId = (
      await db.query.categories.findFirst({
        where: (c, { eq, and }) =>
          and(eq(c.portalId, demoPortalId!), eq(c.slug, "primeiros-passos")),
      })
    )?.id;
    if (!catId) {
      const [created] = await db
        .insert(categories)
        .values({
          accountId,
          portalId: demoPortalId,
          name: "Primeiros passos",
          slug: "primeiros-passos",
        })
        .returning({ id: categories.id });
      catId = created?.id;
    }
    const demoArticle = await db.query.articles.findFirst({
      where: (a, { eq, and }) => and(eq(a.portalId, demoPortalId!), eq(a.slug, "como-comecar")),
    });
    if (!demoArticle) {
      await db.insert(articles).values({
        accountId,
        portalId: demoPortalId,
        categoryId: catId ?? null,
        authorId: adminId,
        title: "Como começar",
        slug: "como-comecar",
        description: "Primeiros passos na plataforma",
        content: "<p>Bem-vindo! Este é o artigo de exemplo da central de ajuda.</p>",
        status: 1,
      });
    }
  }

  // ---- R1: dataset rico (inbox API, times, labels, macros, contatos, conversas) ----
  const accId = accountId;
  const webInboxId = inboxId;

  // notification_settings default (Rails: AccountUser after_create). Bits 2|4|5 on = 26.
  await db
    .insert(notificationSettings)
    .values([
      { accountId: accId, userId: adminId, emailFlags: 26, pushFlags: 26 },
      { accountId: accId, userId: agentId, emailFlags: 26, pushFlags: 26 },
    ])
    .onConflictDoNothing();

  // Inbox API (server-to-server): usada pelo e2e e pela API pública do canal.
  let apiInboxId = (
    await db.query.inboxes.findFirst({
      where: (i, { eq, and }) => and(eq(i.accountId, accId), eq(i.channelType, "Channel::Api")),
    })
  )?.id;
  if (!apiInboxId) {
    const [channel] = await db
      .insert(channelApi)
      .values({ accountId: accId, identifier: "demo-api" })
      .returning({ id: channelApi.id });
    if (!channel) throw new Error("seed: channel_api not created");
    const [inbox] = await db
      .insert(inboxes)
      .values({
        accountId: accId,
        channelId: channel.id,
        channelType: "Channel::Api",
        name: "API Demo",
        greetingEnabled: false,
      })
      .returning({ id: inboxes.id });
    if (!inbox) throw new Error("seed: API inbox not created");
    apiInboxId = inbox.id;
  }
  await db
    .insert(inboxMembers)
    .values({ inboxId: apiInboxId, userId: adminId })
    .onConflictDoNothing();
  await db
    .insert(inboxMembers)
    .values({ inboxId: apiInboxId, userId: agentId })
    .onConflictDoNothing();

  // Labels extras (total 5).
  await db
    .insert(labels)
    .values([
      { accountId: accId, title: "financeiro", color: "#22c55e", showOnSidebar: true },
      { accountId: accId, title: "bug", color: "#f59e0b", showOnSidebar: false },
    ])
    .onConflictDoNothing({ target: [labels.title, labels.accountId] });

  // Times extras (total 3).
  async function ensureTeam(name: string, description: string): Promise<number | undefined> {
    const found = await db.query.teams.findFirst({
      where: (t, { eq, and }) => and(eq(t.accountId, accId), eq(t.name, name)),
    });
    if (found) return found.id;
    const [created] = await db
      .insert(teams)
      .values({ accountId: accId, name, description })
      .returning({ id: teams.id });
    return created?.id;
  }
  const salesTeamId = await ensureTeam("vendas", "Time comercial");
  const financeTeamId = await ensureTeam("financeiro", "Cobrança e notas");
  for (const teamId of [salesTeamId, financeTeamId]) {
    if (!teamId) continue;
    await db
      .insert(teamMembers)
      .values([
        { teamId, userId: adminId },
        { teamId, userId: agentId },
      ])
      .onConflictDoNothing();
  }

  // 3ª resposta pronta.
  const waitCanned = await db.query.cannedResponses.findFirst({
    where: (r, { eq, and }) => and(eq(r.accountId, accId), eq(r.shortCode, "aguarde")),
  });
  if (!waitCanned) {
    await db
      .insert(cannedResponses)
      .values([
        { accountId: accId, shortCode: "aguarde", content: "Só um instante, já vou verificar!" },
      ]);
  }

  // 2ª macro.
  const closeMacro = await db.query.macros.findFirst({
    where: (m, { eq, and }) => and(eq(m.accountId, accId), eq(m.name, "Fechar com suporte")),
  });
  if (!closeMacro) {
    await db.insert(macros).values({
      accountId: accId,
      name: "Fechar com suporte",
      visibility: 1,
      createdById: adminId,
      updatedById: adminId,
      actions: [
        { action_name: "add_label", action_params: ["suporte"] },
        { action_name: "resolve_conversation", action_params: [] },
      ],
    });
  }

  // 2ª automação.
  const budgetRule = await db.query.automationRules.findFirst({
    where: (r, { eq, and }) => and(eq(r.accountId, accId), eq(r.name, "Orçamento via chat")),
  });
  if (!budgetRule) {
    await db.insert(automationRules).values({
      accountId: accId,
      name: "Orçamento via chat",
      description: "Mensagem com 'orçamento' ganha label vendas",
      eventName: "message_created",
      conditions: [
        { attribute_key: "content", filter_operator: "contains", values: ["orçamento"] },
      ],
      actions: [{ action_name: "add_label", action_params: ["vendas"] }],
      active: true,
    });
  }

  // 9 contatos extras (total 10 com a Carla) + vínculo com a inbox do site.
  async function ensureContact(input: {
    name: string;
    email: string;
    phone: string;
    location: string;
    company: string;
  }): Promise<number> {
    const found = await db.query.contacts.findFirst({
      where: (ct, { eq, and }) => and(eq(ct.accountId, accId), eq(ct.email, input.email)),
    });
    let contactId = found?.id;
    if (!contactId) {
      const [created] = await db
        .insert(contacts)
        .values({
          accountId: accId,
          name: input.name,
          email: input.email,
          phoneNumber: input.phone,
          location: input.location,
          additionalAttributes: { company_name: input.company },
        })
        .returning({ id: contacts.id });
      contactId = created?.id;
    }
    if (!contactId) throw new Error(`seed: contact ${input.email} not created`);
    const link = await db.query.contactInboxes.findFirst({
      where: (ci, { eq, and }) => and(eq(ci.contactId, contactId), eq(ci.inboxId, webInboxId)),
    });
    if (!link) {
      await db.insert(contactInboxes).values({
        contactId,
        inboxId: webInboxId,
        sourceId: `seed-web-${input.email}`,
        pubsubToken: crypto.randomUUID(),
      });
    }
    return contactId;
  }

  const extraContacts = [
    {
      name: "João Pereira",
      email: "joao@cliente.test",
      phone: "+5511988887777",
      location: "Rio de Janeiro, RJ",
      company: "Alfa Ltda",
    },
    {
      name: "Maria Lima",
      email: "maria@cliente.test",
      phone: "+5511977776666",
      location: "Belo Horizonte, MG",
      company: "Beta S.A.",
    },
    {
      name: "Pedro Alves",
      email: "pedro@cliente.test",
      phone: "+5511966665555",
      location: "Curitiba, PR",
      company: "Gamma ME",
    },
    {
      name: "Ana Costa",
      email: "ana@cliente.test",
      phone: "+5511955554444",
      location: "Porto Alegre, RS",
      company: "Delta Corp",
    },
    {
      name: "Lucas Rocha",
      email: "lucas@cliente.test",
      phone: "+5511944443333",
      location: "Salvador, BA",
      company: "Épsilon",
    },
    {
      name: "Beatriz Nunes",
      email: "beatriz@cliente.test",
      phone: "+5511933332222",
      location: "Recife, PE",
      company: "Zeta Tech",
    },
    {
      name: "Rafael Dias",
      email: "rafael@cliente.test",
      phone: "+5511922221111",
      location: "Fortaleza, CE",
      company: "Eta Serviços",
    },
    {
      name: "Camila Torres",
      email: "camila@cliente.test",
      phone: "+5511911110000",
      location: "Brasília, DF",
      company: "Theta Group",
    },
    {
      name: "Gustavo Melo",
      email: "gustavo@cliente.test",
      phone: "+5511900009999",
      location: "Campinas, SP",
      company: "Iota Labs",
    },
  ];
  const extraContactIds: number[] = [];
  for (const c of extraContacts) extraContactIds.push(await ensureContact(c));

  // 5 conversas extras (total 6 com a da Carla) com status/assignee variados.
  async function ensureConversation(input: {
    contactId: number;
    inboxId: number;
    status: number;
    assigneeId: number | null;
    priority: number;
    snoozedUntil?: Date;
    inbound: string;
    outgoing?: string;
  }): Promise<{ id: number; firstMessageId: number | null }> {
    const found = await db.query.conversations.findFirst({
      where: (cv, { eq, and }) => and(eq(cv.accountId, accId), eq(cv.contactId, input.contactId)),
    });
    if (found) return { id: found.id, firstMessageId: null };
    const maxDisplay = await db.query.conversations.findFirst({
      where: (cv, { eq }) => eq(cv.accountId, accId),
      orderBy: (cv, { desc }) => desc(cv.displayId),
      columns: { displayId: true },
    });
    const [conv] = await db
      .insert(conversations)
      .values({
        accountId: accId,
        inboxId: input.inboxId,
        contactId: input.contactId,
        displayId: (maxDisplay?.displayId ?? 0) + 1,
        uuid: crypto.randomUUID(),
        status: input.status,
        assigneeId: input.assigneeId,
        priority: input.priority,
        snoozedUntil: input.snoozedUntil ?? null,
        lastActivityAt: new Date(),
      })
      .returning({ id: conversations.id });
    if (!conv) throw new Error("seed: conversation not created");
    const [first] = await db
      .insert(messages)
      .values({
        accountId: accId,
        inboxId: input.inboxId,
        conversationId: conv.id,
        messageType: 0,
        content: input.inbound,
        senderType: "Contact",
        senderId: input.contactId,
      })
      .returning({ id: messages.id });
    if (input.outgoing && input.assigneeId) {
      await db.insert(messages).values({
        accountId: accId,
        inboxId: input.inboxId,
        conversationId: conv.id,
        messageType: 1,
        content: input.outgoing,
        senderType: "User",
        senderId: input.assigneeId,
      });
    }
    return { id: conv.id, firstMessageId: first?.id ?? null };
  }

  const resolved = await ensureConversation({
    contactId: extraContactIds[0]!,
    inboxId: webInboxId,
    status: 1,
    assigneeId: agentId,
    priority: 0,
    inbound: "Meu pedido não chegou ainda, podem verificar?",
    outgoing: "Olá João! Já estou verificando o rastreio com a transportadora.",
  });
  await ensureConversation({
    contactId: extraContactIds[1]!,
    inboxId: webInboxId,
    status: 2,
    assigneeId: null,
    priority: 1,
    inbound: "Podem me enviar uma proposta de renovação?",
  });
  await ensureConversation({
    contactId: extraContactIds[2]!,
    inboxId: webInboxId,
    status: 3,
    assigneeId: agentId,
    priority: 2,
    snoozedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    inbound: "Dúvida sobre a fatura deste mês.",
    outgoing: "Claro! Vou detalhar os itens da fatura para você.",
  });
  await ensureConversation({
    contactId: extraContactIds[3]!,
    inboxId: apiInboxId,
    status: 0,
    assigneeId: adminId,
    priority: 3,
    inbound: "Sistema fora do ar desde cedo!",
    outgoing: "Equipe acionada, já estamos investigando.",
  });
  await ensureConversation({
    contactId: extraContactIds[4]!,
    inboxId: webInboxId,
    status: 0,
    assigneeId: null,
    priority: 0,
    inbound: "Bom dia! Gostaria de tirar uma dúvida.",
  });

  // CSAT na conversa resolvida (Rails: unique por message_id).
  if (resolved.firstMessageId) {
    const existingCsat = await db.query.csatSurveyResponses.findFirst({
      where: (c, { eq }) => eq(c.conversationId, resolved.id),
    });
    if (!existingCsat) {
      await db.insert(csatSurveyResponses).values({
        accountId: accId,
        conversationId: resolved.id,
        messageId: resolved.firstMessageId,
        contactId: extraContactIds[0]!,
        assignedAgentId: agentId,
        rating: 5,
        feedbackMessage: "Atendimento excelente!",
      });
    }
  }

  // Sino populado: 1 notificação por usuário (se ainda não houver).
  const adminNotif = await db.query.notifications.findFirst({
    where: (n, { eq, and }) => and(eq(n.accountId, accId), eq(n.userId, adminId)),
  });
  if (!adminNotif) {
    await db.insert(notifications).values({
      accountId: accId,
      userId: adminId,
      primaryActorType: "Conversation",
      primaryActorId: resolved.id,
      notificationType: 2,
    });
  }
  const agentNotif = await db.query.notifications.findFirst({
    where: (n, { eq, and }) => and(eq(n.accountId, accId), eq(n.userId, agentId)),
  });
  if (!agentNotif) {
    await db.insert(notifications).values({
      accountId: accId,
      userId: agentId,
      primaryActorType: "Conversation",
      primaryActorId: resolved.id,
      notificationType: 2,
    });
  }

  console.log(`seed ok: account=Demo admin=${ADMIN_EMAIL} agent=${AGENT_EMAIL} (${PASSWORD})`);
}

await seed();
process.exit(0);
