import type { InquiryType } from "@/lib/types";
import type { Translate } from "@/lib/inquiry-email";

// Builds the "we got your message" email a visitor receives after sending an
// inquiry. Anyone can type any address into a form, so this email never
// repeats what the visitor typed (name, message): it can't be used to send
// someone else words of the sender's choosing. Piece titles and prices come
// from the server.

export type ConfirmationEmailInput = {
  type: InquiryType;
  /** The site's origin, for links and the brush stroke image. */
  origin: string;
  locale: string;
  siteName: string;
  /** The piece asked about (REQUEST) or ordered (ORDER); empty otherwise. */
  pieces: { title: string; url: string; price?: string }[];
  totals?: string[];
};

/** The brush stroke under the heading (npm run brand-images), shown at half its pixel size. */
export const BRUSH_STROKE = { path: "/email/brush-stroke.png", width: 200, height: 26 };

// The light theme's colours (src/app/tokens.css): most inboxes are light.
const PAPER = "#eee6da";
const PANEL = "#f8f3eb";
const INK = "#2a231c";
const MUTED = "#5e5347";
const ACCENT = "#4f5d2f";
const LINE = "#ddd2c2";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "Karla, 'Helvetica Neue', Arial, sans-serif";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function buildConfirmationEmail(
  input: ConfirmationEmailInput,
  t: Translate,
): { subject: string; text: string; html: string } {
  const siteUrl = `${input.origin}/${input.locale}/originals`;
  const site = new URL(input.origin).host;
  const subject = t("subject", { type: input.type, siteName: input.siteName });
  const heading = t("heading");
  const body = t("body", { type: input.type });
  const piecesHeading = t("pieces", { count: input.pieces.length });
  const total = input.totals && input.totals.length > 0 ? `${t("total")}: ${input.totals.join(" + ")}` : null;
  const replyNote = t("replyNote");
  const visit = t("visit");
  const footer = t("footer", { site });

  const pieceLine = (piece: ConfirmationEmailInput["pieces"][number]) =>
    piece.price ? `${piece.title}, ${piece.price}` : piece.title;

  const text = [
    heading,
    "",
    body,
    ...(input.pieces.length > 0
      ? ["", `${piecesHeading}:`, ...input.pieces.map((piece) => `- ${pieceLine(piece)} (${piece.url})`)]
      : []),
    ...(total ? [total] : []),
    "",
    replyNote,
    "",
    `${input.siteName}: ${siteUrl}`,
    "",
    footer,
  ].join("\n");

  const piecesHtml =
    input.pieces.length > 0
      ? `<p style="margin:28px 0 8px;font-family:${SANS};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};">${escapeHtml(piecesHeading)}</p>
${input.pieces
  .map(
    (piece) =>
      `<p style="margin:0 0 6px;font-family:${SANS};font-size:16px;line-height:1.5;color:${INK};"><a href="${escapeHtml(piece.url)}" style="color:${INK};text-decoration:underline;text-decoration-color:${LINE};">${escapeHtml(piece.title)}</a>${piece.price ? `<span style="color:${MUTED};">&nbsp;·&nbsp;${escapeHtml(piece.price)}</span>` : ""}</p>`,
  )
  .join("\n")}
${total ? `<p style="margin:12px 0 0;padding-top:12px;border-top:1px solid ${LINE};font-family:${SANS};font-size:16px;color:${INK};">${escapeHtml(total)}</p>` : ""}`
      : "";

  const html = `<!doctype html>
<html lang="${escapeHtml(input.locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 0 20px;font-family:${SERIF};font-size:22px;color:${INK};">
<a href="${escapeHtml(siteUrl)}" style="color:${INK};text-decoration:none;">${escapeHtml(input.siteName)}</a>
</td></tr>
<tr><td style="background:${PANEL};border:1px solid ${LINE};padding:40px 32px;">
<h1 style="margin:0;font-family:${SERIF};font-size:40px;font-weight:500;line-height:1.1;color:${INK};">${escapeHtml(heading)}</h1>
<img src="${escapeHtml(input.origin + BRUSH_STROKE.path)}" width="${BRUSH_STROKE.width}" height="${BRUSH_STROKE.height}" alt="" style="display:block;margin:6px 0 24px;border:0;">
<p style="margin:0;font-family:${SANS};font-size:16px;line-height:1.6;color:${INK};">${escapeHtml(body)}</p>
${piecesHtml}
<p style="margin:28px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${INK};">${escapeHtml(replyNote)}</p>
<p style="margin:32px 0 0;"><a href="${escapeHtml(siteUrl)}" style="display:inline-block;padding:12px 22px;background:${ACCENT};color:${PANEL};font-family:${SANS};font-size:12px;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;">${escapeHtml(visit)}</a></p>
</td></tr>
<tr><td style="padding:20px 4px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">${escapeHtml(footer)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
