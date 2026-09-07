/**
 * M10 — Transporte SMTP para o provider de Email (inbox `Channel::Email`).
 * Usa `nodemailer` (import dinâmico — dependência opcional do core).
 */
import type { OutboundContext } from "./types.js";

export interface SmtpMail {
  from: string;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string;
  cc?: string[];
}

export async function sendSmtpMail(ctx: OutboundContext, mail: SmtpMail): Promise<string> {
  const c = ctx.channelConfig;
  const str = (k: string, fallback = ""): string =>
    typeof c[k] === "string" && c[k] ? (c[k] as string) : fallback;
  const num = (k: string, fallback: number): number =>
    typeof c[k] === "number" ? (c[k] as number) : fallback;

  let nodemailer: {
    createTransport: (opts: Record<string, unknown>) => {
      sendMail: (m: Record<string, unknown>) => Promise<{ messageId?: string }>;
    };
  };
  try {
    nodemailer = (await import("nodemailer")) as typeof nodemailer;
  } catch {
    throw new Error(
      "Email: dependência `nodemailer` ausente no server (bun add nodemailer -F @chatwootjs/core)",
    );
  }

  const transporter = nodemailer.createTransport({
    host: str("smtpAddress"),
    port: num("smtpPort", 587),
    secure: Boolean(c.smtpEnableSslTls),
    auth:
      str("smtpLogin") && str("smtpPassword")
        ? { user: str("smtpLogin"), pass: str("smtpPassword") }
        : undefined,
    tls: { rejectUnauthorized: false },
  });

  const info = await transporter.sendMail({
    from: mail.from,
    to: mail.to,
    cc: mail.cc?.join(", "),
    subject: mail.subject,
    text: mail.text,
    inReplyTo: mail.inReplyTo,
  });
  return info.messageId ?? `${Date.now()}@chatwootjs`;
}
