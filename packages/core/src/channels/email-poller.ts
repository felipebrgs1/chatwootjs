/**
 * M10 — Poller IMAP para `Channel::Email` com `imap_enabled`.
 *
 * Varre as inboxes a cada 5 min (in-process; com BullMQ o ideal é trocar o
 * `setInterval` por job repetível — a interface `jobs.dispatch` é a mesma).
 * O fetch usa `imapflow` (import dinâmico = dependência opcional); sem ela,
 * o poller avisa uma vez e o inbound por e-mail segue via `POST
 * /webhooks/email` (SendGrid/SES) ou encaminhamento para `forward_to_email`.
 */
import { db } from "@chatwootjs/db";
import { eq } from "drizzle-orm";

import { jobs } from "../jobs/index.js";
import { ingestInbound } from "./inbound.js";
import { parseInboundEmail } from "./parsers.js";

const POLL_EVERY_MS = 5 * 60_000;
let warnedMissingDep = false;

interface ImapFlowMessage {
  uid: number;
  envelope?: {
    subject?: string;
    from?: Array<{ address?: string; name?: string }>;
    messageId?: string;
    inReplyTo?: string;
  };
  bodyParts?: Map<string, string>;
}

export function registerEmailPollerJob(): void {
  jobs.on("email:poll-inbox", async (payload) => {
    const { accountId, inboxId } = payload as { accountId: number; inboxId: number };
    await pollInbox(accountId, inboxId);
  });

  const tick = async () => {
    try {
      const rows = await db.query.inboxes.findMany({
        where: (i) => eq(i.channelType, "Channel::Email"),
      });
      for (const inbox of rows) {
        const cfg = await db.query.channelEmail.findFirst({
          where: (c) => eq(c.id, inbox.channelId),
        });
        if (!cfg?.imapEnabled) continue;
        await jobs.dispatch({
          name: "email:poll-inbox",
          payload: { accountId: inbox.accountId, inboxId: inbox.id },
        });
      }
    } catch (err) {
      console.error("[email:poll]", err);
    }
  };
  const g = globalThis as Record<string, unknown>;
  if (!g.__cw_email_poll_registered) {
    g.__cw_email_poll_registered = true;
    setInterval(() => void tick(), POLL_EVERY_MS);
  }
}

async function pollInbox(accountId: number, inboxId: number): Promise<void> {
  const inbox = await db.query.inboxes.findFirst({
    where: (i) => eq(i.id, inboxId),
  });
  const cfg = inbox
    ? await db.query.channelEmail.findFirst({ where: (c) => eq(c.id, inbox.channelId) })
    : null;
  if (!inbox || !cfg?.imapEnabled || !cfg.imapAddress) return;

  let ImapFlow: new (opts: Record<string, unknown>) => {
    connect: () => Promise<void>;
    logout: () => Promise<void>;
    mailboxOpen: (box: string) => Promise<void>;
    fetch: (range: string, opts: Record<string, unknown>) => AsyncGenerator<ImapFlowMessage>;
    messageFlagsAdd: (uid: number, flags: string[]) => Promise<void>;
  };
  try {
    // Specifier não-literal → TS não tenta resolver tipos (dep. opcional).
    const specifier = "imapflow";
    ({ ImapFlow } = (await import(specifier)) as {
      ImapFlow: typeof ImapFlow;
    });
  } catch {
    if (!warnedMissingDep) {
      warnedMissingDep = true;
      console.warn(
        "[email:poll] `imapflow` ausente — inbound de e-mail via POST /webhooks/email. " +
          "Para IMAP: bun add imapflow -F @chatwootjs/core (ver docs/canais/email.md).",
      );
    }
    return;
  }

  const client = new ImapFlow({
    host: cfg.imapAddress,
    port: cfg.imapPort || 993,
    secure: cfg.imapEnableSsl,
    auth: { user: cfg.imapLogin, pass: cfg.imapPassword },
    logger: false,
  });
  try {
    await client.connect();
    await client.mailboxOpen("INBOX");
    for await (const msg of client.fetch("1:*", {
      envelope: true,
      bodyParts: ["text"],
      flags: true,
    }) as AsyncGenerator<ImapFlowMessage & { flags?: Set<string> }>) {
      const flags = (msg as { flags?: Set<string> }).flags;
      if (flags?.has("\\Seen")) continue;
      const from = msg.envelope?.from?.[0];
      if (!from?.address || !msg.envelope?.messageId) continue;
      const text = msg.bodyParts?.get("text") ?? "";
      const item = parseInboundEmail({
        messageId: msg.envelope.messageId,
        from: from.address,
        fromName: from.name,
        subject: msg.envelope.subject,
        textBody: text,
        inReplyTo: msg.envelope.inReplyTo,
      });
      if (item) await ingestInbound(accountId, inboxId, item);
      await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
    }
  } catch (err) {
    console.error(`[email:poll] inbox ${inboxId}`, err);
  } finally {
    try {
      await client.logout();
    } catch {
      /* já desconectado */
    }
  }
}
