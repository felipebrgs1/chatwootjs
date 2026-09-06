import {
  conversations,
  csatSurveyResponses,
  db,
  messages,
  reportingEvents,
  reportingEventsRollups,
} from "@chatwootjs/db";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { UnprocessableError } from "../lib/errors.js";
import { subscribe } from "../realtime/index.js";
import type { AuthCtx } from "../policies/index.js";
import type { ReportsQuery } from "../schemas/reports.js";
import { findConversation } from "./conversations.js";

// Relatórios + CSAT — espelha reports_controller e os workers que geram
// reporting_events (first_response, resolution, csat).

export interface Range {
  since: Date;
  until: Date;
  timezoneOffset: number;
}

export function toRange(query: ReportsQuery): Range {
  const until = query.until ? new Date(`${query.until}T23:59:59.999Z`) : new Date();
  const since = query.since
    ? new Date(`${query.since}T00:00:00.000Z`)
    : new Date(until.getTime() - 30 * 24 * 3600_000);
  if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) {
    throw new UnprocessableError("Invalid date range", { since: ["datas inválidas"] });
  }
  return { since, until, timezoneOffset: query.timezone_offset };
}

function avg(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ---- Emissores ----

async function hasEvent(
  accountId: number,
  conversationId: number,
  name: string,
  after?: Date,
): Promise<boolean> {
  const conds = [
    eq(reportingEvents.accountId, accountId),
    eq(reportingEvents.conversationId, conversationId),
    eq(reportingEvents.name, name),
  ];
  if (after) conds.push(gte(reportingEvents.createdAt, after));
  const rows = await db.query.reportingEvents.findMany({
    where: () => and(...conds),
    columns: { id: true },
    limit: 1,
  });
  return rows.length > 0;
}

async function recordEvent(input: {
  accountId: number;
  conversationId?: number | null;
  inboxId?: number | null;
  teamId?: number | null;
  userId?: number | null;
  name: string;
  value?: number | null;
  eventStart?: Date | null;
  eventEnd?: Date | null;
}): Promise<void> {
  await db.insert(reportingEvents).values({
    accountId: input.accountId,
    conversationId: input.conversationId ?? null,
    inboxId: input.inboxId ?? null,
    teamId: input.teamId ?? null,
    userId: input.userId ?? null,
    name: input.name,
    value: input.value ?? null,
    eventStartTime: input.eventStart ?? null,
    eventEndTime: input.eventEnd ?? null,
  });
}

/**
 * Hooks de domínio (idempotentes): primeira resposta do agente →
 * first_response; conversa resolvida → resolution; tudo via realtime,
 * sem tocar nos services M4.
 */
export function registerReportingEmitters(): void {
  if (globalThis.__cw_reporting_registered) return;
  globalThis.__cw_reporting_registered = true;

  subscribe("message.created", ({ accountId, data }) => {
    void (async () => {
      const msg = data as {
        id: number;
        conversation_id: number;
        message_type: string;
        private: boolean;
        sender?: { id: number | null; type: string | null } | null;
        created_at: number;
      };
      if (msg.message_type !== "outgoing" || msg.private) return;
      if (msg.sender?.type !== "User" || !msg.sender.id) return;
      const conv = await db.query.conversations.findFirst({
        where: (c) => and(eq(c.accountId, accountId), eq(c.id, msg.conversation_id)),
      });
      if (!conv) return;
      if (await hasEvent(accountId, conv.id, "first_response")) return;
      const at = new Date(msg.created_at * 1000);
      await recordEvent({
        accountId,
        conversationId: conv.id,
        inboxId: conv.inboxId,
        teamId: conv.teamId,
        userId: msg.sender?.id ?? conv.assigneeId,
        name: "first_response",
        value: Math.max(0, (at.getTime() - conv.createdAt.getTime()) / 1000),
        eventStart: conv.createdAt,
        eventEnd: at,
      });
    })().catch((err) => console.error("[reporting] first_response", err));
  });

  subscribe("conversation.updated", ({ accountId, data }) => {
    void (async () => {
      const conv = data as { id: number; status: string };
      if (conv.status !== "resolved" || typeof conv.id !== "number") return;
      const row = await findConversation(accountId, conv.id);
      const sinceStatus = row.statusChangedAt ?? row.updatedAt;
      if (await hasEvent(accountId, row.id, "resolution", sinceStatus)) return;
      await recordEvent({
        accountId,
        conversationId: row.id,
        inboxId: row.inboxId,
        teamId: row.teamId,
        userId: row.assigneeId,
        name: "resolution",
        value: Math.max(0, (sinceStatus.getTime() - row.createdAt.getTime()) / 1000),
        eventStart: row.createdAt,
        eventEnd: sinceStatus,
      });
    })().catch((err) => console.error("[reporting] resolution", err));
  });
}

declare global {
  // eslint-disable-next-line no-var
  var __cw_reporting_registered: boolean | undefined;
}

// ---- CSAT ----

export interface ApiCsatResponse {
  id: number;
  rating: number;
  feedback: string | null;
  conversation_id: number;
}

/** Registra a resposta (link do e-mail/widget) + evento `csat`. */
export async function submitCsat(
  accountId: number,
  auth: AuthCtx,
  conversationId: number,
  input: { rating: number; feedback?: string },
): Promise<ApiCsatResponse> {
  const conv = await findConversation(accountId, conversationId);
  if (!conv.contactId) throw new UnprocessableError("Conversation without contact");
  const lastOutgoing = await db.query.messages.findFirst({
    where: (m) =>
      and(
        eq(m.accountId, accountId),
        eq(m.conversationId, conv.id),
        eq(m.messageType, 1),
        eq(m.private, false),
      ),
    orderBy: (m) => desc(m.createdAt),
  });
  if (!lastOutgoing) {
    throw new UnprocessableError("No agent message to rate", {
      rating: ["conversa sem resposta do agente"],
    });
  }
  const [row] = await db
    .insert(csatSurveyResponses)
    .values({
      accountId,
      conversationId: conv.id,
      messageId: lastOutgoing.id,
      rating: input.rating,
      feedbackMessage: input.feedback || null,
      contactId: conv.contactId,
      assignedAgentId: conv.assigneeId,
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not save CSAT");
  await recordEvent({
    accountId,
    conversationId: conv.id,
    inboxId: conv.inboxId,
    teamId: conv.teamId,
    userId: conv.assigneeId,
    name: "csat",
    value: input.rating,
  });
  void auth;
  return {
    id: row.id,
    rating: row.rating,
    feedback: row.feedbackMessage,
    conversation_id: conv.id,
  };
}

// ---- Consultas ----

export interface Summary {
  conversations_count: number;
  incoming_messages_count: number;
  outgoing_messages_count: number;
  resolutions_count: number;
  avg_first_response_time: number | null;
  avg_resolution_time: number | null;
  reply_time: number | null;
}

async function countConversations(accountId: number, range: Range): Promise<number> {
  const [agg] = await db
    .select({ value: sql<number>`count(*)` })
    .from(conversations)
    .where(
      and(
        eq(conversations.accountId, accountId),
        gte(conversations.createdAt, range.since),
        lte(conversations.createdAt, range.until),
      ),
    );
  return Number(agg?.value ?? 0);
}

async function countMessages(
  accountId: number,
  range: Range,
  messageType: number,
): Promise<number> {
  const [agg] = await db
    .select({ value: sql<number>`count(*)` })
    .from(messages)
    .where(
      and(
        eq(messages.accountId, accountId),
        eq(messages.messageType, messageType),
        gte(messages.createdAt, range.since),
        lte(messages.createdAt, range.until),
      ),
    );
  return Number(agg?.value ?? 0);
}

async function eventValues(
  accountId: number,
  range: Range,
  name: string,
): Promise<Array<number | null>> {
  const rows = await db.query.reportingEvents.findMany({
    where: (e) =>
      and(
        eq(e.accountId, accountId),
        eq(e.name, name),
        gte(e.createdAt, range.since),
        lte(e.createdAt, range.until),
      ),
    columns: { value: true },
    limit: 100_000,
  });
  return rows.map((r) => r.value);
}

async function eventCount(accountId: number, range: Range, name: string): Promise<number> {
  const [agg] = await db
    .select({ value: sql<number>`count(*)` })
    .from(reportingEvents)
    .where(
      and(
        eq(reportingEvents.accountId, accountId),
        eq(reportingEvents.name, name),
        gte(reportingEvents.createdAt, range.since),
        lte(reportingEvents.createdAt, range.until),
      ),
    );
  return Number(agg?.value ?? 0);
}

export async function getSummary(accountId: number, query: ReportsQuery): Promise<Summary> {
  const range = toRange(query);
  const [convs, incoming, outgoing, resolutions, firstResp, resolutionTimes] = await Promise.all([
    countConversations(accountId, range),
    countMessages(accountId, range, 0),
    countMessages(accountId, range, 1),
    eventCount(accountId, range, "resolution"),
    eventValues(accountId, range, "first_response"),
    eventValues(accountId, range, "resolution"),
  ]);
  const avgFirst = avg(firstResp);
  return {
    conversations_count: convs,
    incoming_messages_count: incoming,
    outgoing_messages_count: outgoing,
    resolutions_count: resolutions,
    avg_first_response_time: avgFirst,
    avg_resolution_time: avg(resolutionTimes),
    reply_time: avgFirst,
  };
}

export interface BreakdownRow {
  id: number | string;
  name: string;
  conversations_count: number;
  resolutions_count: number;
  avg_first_response_time: number | null;
  avg_resolution_time: number | null;
}

async function breakdown(
  accountId: number,
  query: ReportsQuery,
  dimension: "user" | "team" | "inbox" | "label",
): Promise<BreakdownRow[]> {
  const range = toRange(query);
  if (dimension === "label") {
    const { taggings } = await import("@chatwootjs/db");
    const allLabels = await db.query.labels.findMany({
      where: (l) => eq(l.accountId, accountId),
      columns: { id: true, title: true },
    });
    const rows: BreakdownRow[] = [];
    for (const label of allLabels) {
      const tagged = await db
        .select({ taggableId: taggings.taggableId })
        .from(taggings)
        .where(
          and(
            eq(taggings.accountId, accountId),
            eq(taggings.tagId, label.id),
            eq(taggings.taggableType, "Conversation"),
          ),
        );
      const ids = [...new Set(tagged.map((t) => t.taggableId))];
      if (ids.length === 0) continue;
      const convs = await db.query.conversations.findMany({
        where: (c) =>
          and(
            eq(c.accountId, accountId),
            inArray(c.id, ids),
            gte(c.createdAt, range.since),
            lte(c.createdAt, range.until),
          ),
        columns: { id: true },
      });
      if (convs.length === 0) continue;
      const cids = convs.map((c) => c.id);
      const [res, first, resol] = await Promise.all([
        eventCountForConversations(accountId, cids, "resolution", range),
        eventValuesForConversations(accountId, cids, "first_response", range),
        eventValuesForConversations(accountId, cids, "resolution", range),
      ]);
      rows.push({
        id: label.id,
        name: label.title ?? "",
        conversations_count: convs.length,
        resolutions_count: res,
        avg_first_response_time: avg(first),
        avg_resolution_time: avg(resol),
      });
    }
    return rows.sort((a, b) => b.conversations_count - a.conversations_count);
  }

  const column =
    dimension === "user"
      ? conversations.assigneeId
      : dimension === "team"
        ? conversations.teamId
        : conversations.inboxId;
  const grouped = await db
    .select({ key: column, count: sql<number>`count(*)` })
    .from(conversations)
    .where(
      and(
        eq(conversations.accountId, accountId),
        gte(conversations.createdAt, range.since),
        lte(conversations.createdAt, range.until),
      ),
    )
    .groupBy(column);
  const rows: BreakdownRow[] = [];
  for (const g of grouped) {
    if (g.key === null || g.key === undefined) continue;
    const key = Number(g.key);
    const cids = (
      await db.query.conversations.findMany({
        where: (c) =>
          and(
            eq(c.accountId, accountId),
            eq(column, key),
            gte(c.createdAt, range.since),
            lte(c.createdAt, range.until),
          ),
        columns: { id: true },
        limit: 100_000,
      })
    ).map((c) => c.id);
    const [res, first, resol] = await Promise.all([
      eventCountForConversations(accountId, cids, "resolution", range),
      eventValuesForConversations(accountId, cids, "first_response", range),
      eventValuesForConversations(accountId, cids, "resolution", range),
    ]);
    rows.push({
      id: key,
      name: await dimensionName(dimension, accountId, key),
      conversations_count: Number(g.count),
      resolutions_count: res,
      avg_first_response_time: avg(first),
      avg_resolution_time: avg(resol),
    });
  }
  return rows.sort((a, b) => b.conversations_count - a.conversations_count);
}

async function eventCountForConversations(
  accountId: number,
  conversationIds: number[],
  name: string,
  range: Range,
): Promise<number> {
  if (conversationIds.length === 0) return 0;
  const [agg] = await db
    .select({ value: sql<number>`count(*)` })
    .from(reportingEvents)
    .where(
      and(
        eq(reportingEvents.accountId, accountId),
        eq(reportingEvents.name, name),
        inArray(reportingEvents.conversationId, conversationIds),
        gte(reportingEvents.createdAt, range.since),
        lte(reportingEvents.createdAt, range.until),
      ),
    );
  return Number(agg?.value ?? 0);
}

async function eventValuesForConversations(
  accountId: number,
  conversationIds: number[],
  name: string,
  range: Range,
): Promise<Array<number | null>> {
  if (conversationIds.length === 0) return [];
  const rows = await db.query.reportingEvents.findMany({
    where: (e) =>
      and(
        eq(e.accountId, accountId),
        eq(e.name, name),
        inArray(e.conversationId, conversationIds),
        gte(e.createdAt, range.since),
        lte(e.createdAt, range.until),
      ),
    columns: { value: true },
    limit: 100_000,
  });
  return rows.map((r) => r.value);
}

async function dimensionName(
  dimension: "user" | "team" | "inbox",
  accountId: number,
  key: number,
): Promise<string> {
  if (dimension === "user") {
    const u = await db.query.users.findFirst({
      where: (x) => eq(x.id, key),
      columns: { name: true },
    });
    return u?.name ?? `#${key}`;
  }
  if (dimension === "team") {
    const t = await db.query.teams.findFirst({
      where: (x) => and(eq(x.accountId, accountId), eq(x.id, key)),
      columns: { name: true },
    });
    return t?.name ?? `#${key}`;
  }
  const i = await db.query.inboxes.findFirst({
    where: (x) => and(eq(x.accountId, accountId), eq(x.id, key)),
    columns: { name: true },
  });
  return i?.name ?? `#${key}`;
}

export const getAgentsReport = (accountId: number, q: ReportsQuery) =>
  breakdown(accountId, q, "user");
export const getTeamsReport = (accountId: number, q: ReportsQuery) =>
  breakdown(accountId, q, "team");
export const getInboxesReport = (accountId: number, q: ReportsQuery) =>
  breakdown(accountId, q, "inbox");
export const getLabelsReport = (accountId: number, q: ReportsQuery) =>
  breakdown(accountId, q, "label");

// ---- Overview (série diária; timezone_offset desloca o bucket) ----

export interface OverviewPoint {
  date: string;
  conversations_count: number;
  resolutions_count: number;
}

export async function getOverview(
  accountId: number,
  query: ReportsQuery,
): Promise<OverviewPoint[]> {
  const range = toRange(query);
  // timezone_offset do Rails: desloca o bucket do dia (offset validado como int).
  const shift = sql.raw(`interval '${range.timezoneOffset} minutes'`);
  const rows = await db
    .select({
      date: sql<string>`to_char(${conversations.createdAt} + ${shift}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)`,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.accountId, accountId),
        gte(conversations.createdAt, range.since),
        lte(conversations.createdAt, range.until),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  const byDate = new Map(rows.map((r) => [r.date, Number(r.count)]));
  const resRows = await db
    .select({
      date: sql<string>`to_char(${reportingEvents.createdAt} + ${shift}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)`,
    })
    .from(reportingEvents)
    .where(
      and(
        eq(reportingEvents.accountId, accountId),
        eq(reportingEvents.name, "resolution"),
        gte(reportingEvents.createdAt, range.since),
        lte(reportingEvents.createdAt, range.until),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  const resByDate = new Map(resRows.map((r) => [r.date, Number(r.count)]));
  const days: OverviewPoint[] = [];
  const cursor = new Date(range.since);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(range.until);
  while (cursor <= end && days.length < 366) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({
      date: key,
      conversations_count: byDate.get(key) ?? 0,
      resolutions_count: resByDate.get(key) ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

// ---- CSAT ----

export interface CsatReport {
  total: number;
  average: number | null;
  distribution: Array<{ rating: number; count: number }>;
  response_rate: number | null;
}

export async function getCsatReport(accountId: number, query: ReportsQuery): Promise<CsatReport> {
  const range = toRange(query);
  const rows = await db.query.csatSurveyResponses.findMany({
    where: (r) =>
      and(eq(r.accountId, accountId), gte(r.createdAt, range.since), lte(r.createdAt, range.until)),
    columns: { rating: true },
    limit: 100_000,
  });
  const distribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: rows.filter((r) => r.rating === rating).length,
  }));
  const resolved = await eventCount(accountId, range, "resolution");
  return {
    total: rows.length,
    average: avg(rows.map((r) => r.rating)),
    distribution,
    response_rate: resolved > 0 ? rows.length / resolved : null,
  };
}

// ---- Rollup diário ----

async function rollupDay(accountId: number, day: string): Promise<void> {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T23:59:59.999Z`);
  const rows = await db
    .select({
      name: reportingEvents.name,
      count: sql<number>`count(*)`,
      sum: sql<number>`coalesce(sum(${reportingEvents.value}), 0)`,
    })
    .from(reportingEvents)
    .where(
      and(
        eq(reportingEvents.accountId, accountId),
        gte(reportingEvents.createdAt, start),
        lte(reportingEvents.createdAt, end),
      ),
    )
    .groupBy(reportingEvents.name);
  for (const row of rows) {
    if (!row.name) continue;
    await db
      .insert(reportingEventsRollups)
      .values({
        accountId,
        date: day,
        dimensionType: "account",
        dimensionId: accountId,
        metric: row.name,
        count: Number(row.count),
        sumValue: Number(row.sum),
      })
      .onConflictDoUpdate({
        target: [
          reportingEventsRollups.accountId,
          reportingEventsRollups.date,
          reportingEventsRollups.dimensionType,
          reportingEventsRollups.dimensionId,
          reportingEventsRollups.metric,
        ],
        set: {
          count: Number(row.count),
          sumValue: Number(row.sum),
          updatedAt: new Date(),
        },
      });
  }
}

/** Agrega o dia anterior (24h + backfill no boot). */
export async function runRollupOnce(accountId: number): Promise<void> {
  const yesterday = new Date(Date.now() - 24 * 3600_000).toISOString().slice(0, 10);
  await rollupDay(accountId, yesterday);
}

export function registerReportingRollup(): void {
  if (globalThis.__cw_reporting_rollup_registered) return;
  globalThis.__cw_reporting_rollup_registered = true;
  const tick = () => {
    void (async () => {
      const accounts = await db.query.accounts.findMany({ columns: { id: true }, limit: 1000 });
      for (const a of accounts) await runRollupOnce(a.id);
    })().catch((err) => console.error("[reporting rollup]", err));
  };
  setInterval(tick, 24 * 3600_000);
}

declare global {
  // eslint-disable-next-line no-var
  var __cw_reporting_rollup_registered: boolean | undefined;
}
