import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";

// Sends inquiry emails to the artist (MAIL_TO), confirmations to visitors, and
// password reset links to account holders, through SMTP. In development,
// when SMTP isn't configured, messages are written to .outbox/ as .eml files
// instead, so nothing real is sent while building.

export type OutgoingMail = {
  subject: string;
  text: string;
  /** An HTML version; `text` stays as the plain-text alternative. */
  html?: string;
  /** The visitor's address, so replying from the inbox reaches them. */
  replyTo?: string;
  /** Defaults to the artist's inbox (MAIL_TO); password reset links go to the account's email. */
  to?: string;
  /**
   * Who it comes from, when not MAIL_FROM: "noreply" for account emails
   * (verification, password resets) from MAIL_FROM_NOREPLY, "inquiries" for
   * the visitor's inquiry confirmation from MAIL_FROM_INQUIRIES. Each falls
   * back to MAIL_FROM. Gmail sends from an address only if it is a "Send mail
   * as" alias of SMTP_USER.
   */
  sender?: Sender;
};

type Sender = "noreply" | "inquiries";

const SENDER_ENV: Record<Sender, string> = {
  noreply: "MAIL_FROM_NOREPLY",
  inquiries: "MAIL_FROM_INQUIRIES",
};

/** The From address for `sender`, or undefined to use MAIL_FROM. */
function senderAddress(sender: Sender | undefined): string | undefined {
  return (sender && process.env[SENDER_ENV[sender]]) || undefined;
}

export class MailNotConfiguredError extends Error {
  constructor() {
    super("SMTP is not configured: set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_TO");
  }
}

const OUTBOX_DIR = path.join(process.cwd(), ".outbox");

let smtp: Transporter | null = null;

function smtpConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO } =
    process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_TO) return null;
  const port = Number(SMTP_PORT) || 465;
  return {
    transport: {
      host: SMTP_HOST,
      port,
      // 465 is TLS from the start; 587 upgrades with STARTTLS.
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    },
    from: MAIL_FROM || SMTP_USER,
    to: MAIL_TO,
  };
}

export async function sendMail(mail: OutgoingMail): Promise<void> {
  const config = smtpConfig();

  if (config) {
    smtp ??= nodemailer.createTransport(config.transport);
    await smtp.sendMail({
      from: senderAddress(mail.sender) ?? config.from,
      to: mail.to ?? config.to,
      replyTo: mail.replyTo,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return;
  }

  if (process.env.NODE_ENV === "production") throw new MailNotConfiguredError();
  await writeToOutbox(mail);
}

async function writeToOutbox(mail: OutgoingMail) {
  const outbox = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const info = await outbox.sendMail({
    from: senderAddress(mail.sender) ?? (process.env.MAIL_FROM || "website@localhost"),
    to: mail.to ?? (process.env.MAIL_TO || "artist@localhost"),
    replyTo: mail.replyTo,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  await mkdir(OUTBOX_DIR, { recursive: true });
  const file = path.join(OUTBOX_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}.eml`);
  await writeFile(file, info.message as Buffer);
  console.info(`[mail] SMTP not configured; saved to ${file}\n${mail.subject}\n\n${mail.text}`);
}
