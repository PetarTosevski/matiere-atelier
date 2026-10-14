import { BRUSH_STROKE, EMAIL_STYLE, escapeHtml } from "@/lib/confirmation-email";
import type { Translate } from "@/lib/inquiry-email";

// Builds the "new work" email that subscribers get when a piece goes on the
// site for the first time (lib/newsletter.ts sends it). Everything in it comes
// from the server: titles, sizes and prices as the site shows them.

export type NewWorkPiece = {
  title: string;
  url: string;
  /** An absolute URL of the cover, already resized for email. */
  image: { src: string; width: number; height: number; alt: string } | null;
  dimensions: string | null;
  /** Only when the site shows it (getPriceView). */
  price: string | null;
  /** A plain-text excerpt of the description (no markdown or HTML); empty when there is none. */
  description: string;
};

export type NewWorkEmailInput = {
  origin: string;
  locale: string;
  siteName: string;
  firstName: string;
  pieces: NewWorkPiece[];
  unsubscribeUrl: string;
};

const { PAPER, PANEL, INK, MUTED, ACCENT, LINE, SERIF, SANS } = EMAIL_STYLE;
/** The mat around each painting, inside the panel's 496 px. */
const MAT_PADDING = 24;
const IMAGE_MAX_WIDTH = 496 - 2 * MAT_PADDING;
/** Tall paintings are narrowed to this height, so one piece doesn't fill several screens. */
const IMAGE_MAX_HEIGHT = 480;

/** The painting's size in the email: as wide as fits, never taller than IMAGE_MAX_HEIGHT, never cropped. */
export function emailImageSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(IMAGE_MAX_WIDTH / width, IMAGE_MAX_HEIGHT / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function buildNewWorkEmail(input: NewWorkEmailInput, t: Translate): { subject: string; text: string; html: string } {
  const count = input.pieces.length;
  const originals = `${input.origin}/${input.locale}/originals`;
  const site = new URL(input.origin).host;
  const subject = t("subject", { count, title: input.pieces[0]?.title ?? "", siteName: input.siteName });
  const heading = t("heading", { count });
  const greeting = t("greeting", { name: input.firstName });
  const intro = t("intro", { count });
  const viewPiece = t("viewPiece");
  const seeAll = t("seeAll");
  const footer = t("footer", { site });
  const unsubscribe = t("unsubscribe");

  const details = (piece: NewWorkPiece) => [piece.dimensions, piece.price].filter(Boolean).join(" · ");

  const text = [
    heading,
    "",
    greeting,
    "",
    intro,
    "",
    ...input.pieces.flatMap((piece) => [
      piece.title,
      ...(piece.description ? [piece.description] : []),
      ...(details(piece) ? [details(piece)] : []),
      piece.url,
      "",
    ]),
    `${seeAll}: ${originals}`,
    "",
    footer,
    `${unsubscribe}: ${input.unsubscribeUrl}`,
  ].join("\n");

  const pieceHtml = (piece: NewWorkPiece, index: number) => {
    // The painting on a mat, like the cards on Originals; the whole mat links to the piece.
    const image = piece.image
      ? (() => {
          const size = emailImageSize(piece.image.width, piece.image.height);
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};"><tr><td align="center" style="padding:${MAT_PADDING}px;">
<a href="${escapeHtml(piece.url)}"><img src="${escapeHtml(piece.image.src)}" width="${size.width}" height="${size.height}" alt="${escapeHtml(piece.image.alt || piece.title)}" style="display:block;width:${size.width}px;max-width:100%;height:auto;border:0;box-shadow:0 10px 24px rgba(42,35,28,0.18);"></a>
</td></tr></table>`;
        })()
      : "";
    const number = count > 1 ? `<span style="font-family:${SERIF};color:${ACCENT};">${String(index + 1).padStart(2, "0")}</span>&nbsp;&nbsp;` : "";
    // Under the description, on a hairline: the size quiet on the left, the price in the accent serif on the right.
    const facts =
      piece.dimensions || piece.price
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid ${LINE};"><tr>
<td style="padding:14px 0 0;vertical-align:bottom;font-family:${SANS};font-size:15px;color:${MUTED};">${piece.dimensions ? escapeHtml(piece.dimensions) : "&nbsp;"}</td>
${piece.price ? `<td align="right" style="padding:14px 0 0;vertical-align:bottom;font-family:${SERIF};font-size:28px;line-height:1;color:${ACCENT};white-space:nowrap;">${escapeHtml(piece.price)}</td>` : ""}
</tr></table>`
        : "";
    // Title, painting, description, then size and price.
    return `<tr><td style="padding:36px 0 0;">
<p style="margin:0 0 16px;font-family:${SERIF};font-size:28px;line-height:1.2;color:${INK};">${number}<a href="${escapeHtml(piece.url)}" style="color:${INK};text-decoration:none;">${escapeHtml(piece.title)}</a></p>
${image}
${piece.description ? `<p style="margin:18px 0 0;font-family:${SANS};font-size:16px;line-height:1.65;color:${INK};">${escapeHtml(piece.description)}</p>` : ""}
${facts}
<p style="margin:18px 0 0;"><a href="${escapeHtml(piece.url)}" style="font-family:${SANS};font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};text-decoration:none;border-bottom:1px solid ${ACCENT};padding-bottom:2px;">${escapeHtml(viewPiece)}&nbsp;→</a></p>
</td></tr>`;
  };

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
<a href="${escapeHtml(originals)}" style="color:${INK};text-decoration:none;">${escapeHtml(input.siteName)}</a>
</td></tr>
<tr><td style="background:${PANEL};border:1px solid ${LINE};padding:40px 32px;">
<h1 style="margin:0;font-family:${SERIF};font-size:40px;font-weight:500;line-height:1.1;color:${INK};">${escapeHtml(heading)}</h1>
<img src="${escapeHtml(input.origin + BRUSH_STROKE.path)}" width="${BRUSH_STROKE.width}" height="${BRUSH_STROKE.height}" alt="" style="display:block;margin:6px 0 24px;border:0;">
<p style="margin:0 0 12px;font-family:${SANS};font-size:16px;line-height:1.6;color:${INK};">${escapeHtml(greeting)}</p>
<p style="margin:0;font-family:${SANS};font-size:16px;line-height:1.6;color:${INK};">${escapeHtml(intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${input.pieces.map(pieceHtml).join("\n")}
</table>
<p style="margin:36px 0 0;"><a href="${escapeHtml(originals)}" style="display:inline-block;padding:12px 22px;background:${ACCENT};color:${PANEL};font-family:${SANS};font-size:12px;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;">${escapeHtml(seeAll)}</a></p>
</td></tr>
<tr><td style="padding:20px 4px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">${escapeHtml(footer)} <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${MUTED};">${escapeHtml(unsubscribe)}</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
