"use server";

import { headers } from "next/headers";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getArtworkBySlug, getArtworksByIds } from "@/lib/artworks";
import { resolveCart, subtotals } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import {
  HONEYPOT_FIELD,
  inquiryTypeSchema,
  readInquiryForm,
  validateInquiry,
  type FieldErrorKey,
} from "@/lib/inquiry";
import { buildInquiryEmail, type InquiryEmailInput } from "@/lib/inquiry-email";
import { sendMail } from "@/lib/mail";
import { isCartEnabled } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/settings";
import { getSiteUrl } from "@/lib/site";

export type InquiryErrorKey =
  | "invalid"
  | "rateLimited"
  | "unavailable"
  | "cartChanged"
  | "sendFailed";

export type InquiryState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      error: InquiryErrorKey;
      fieldErrors?: Partial<Record<string, FieldErrorKey>>;
      /** Echoed back so the form keeps what the visitor typed. */
      values?: Record<string, string>;
    };

const LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

async function clientIp(): Promise<string> {
  const list = await headers();
  return (
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    list.get("x-real-ip") ||
    "unknown"
  );
}

export async function submitInquiry(
  _previous: InquiryState,
  form: FormData,
): Promise<InquiryState> {
  const type = inquiryTypeSchema.safeParse(form.get("type"));
  if (!type.success) return { status: "error", error: "invalid" };

  // Bots fill every field. Pretend it worked so they don't adapt.
  const honeypot = form.get(HONEYPOT_FIELD);
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { status: "success" };
  }

  const raw = readInquiryForm(type.data, form);
  const values = Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

  const result = validateInquiry(type.data, raw);
  if (!result.success) {
    return { status: "error", error: "invalid", fieldErrors: result.fieldErrors, values };
  }

  if (!rateLimit(`inquiry:${await clientIp()}`, LIMIT)) {
    return { status: "error", error: "rateLimited", values };
  }

  const localeValue = form.get("locale");
  const locale = hasLocale(routing.locales, localeValue)
    ? localeValue
    : routing.defaultLocale;
  const origin = getSiteUrl().origin;
  const artworkUrl = (slug: string) => `${origin}/${locale}/originals/${slug}`;

  let email: InquiryEmailInput;
  const input = { type: type.data, data: result.data } as InquiryEmailInput;

  if (input.type === "REQUEST") {
    const artwork = await getArtworkBySlug(input.data.artworkSlug);
    if (!artwork) return { status: "error", error: "unavailable", values };
    email = { ...input, artwork: { title: artwork.title, url: artworkUrl(artwork.slug) } };
  } else if (input.type === "ORDER") {
    const settings = await getSiteSettings();
    if (!isCartEnabled(settings)) return { status: "error", error: "unavailable", values };
    // Never trust the browser's idea of the cart: check every piece again.
    const cart = resolveCart(
      input.data.artworkIds,
      await getArtworksByIds(input.data.artworkIds),
      settings,
    );
    if (cart.removed.length > 0 || cart.items.length === 0) {
      return { status: "error", error: "cartChanged", values };
    }
    email = {
      ...input,
      items: cart.items.map((item) => ({
        title: item.title,
        url: artworkUrl(item.slug),
        price: formatPrice(item.price.amount, item.price.currency, locale),
      })),
      totals: subtotals(cart.items).map((total) =>
        formatPrice(total.amount, total.currency, locale),
      ),
    };
  } else {
    email = input;
  }

  // Emails go to the artist, so they use the default locale's copy.
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Email" });
  const message = buildInquiryEmail(email, (key, params) =>
    t(key as never, params as never),
  );

  try {
    await sendMail({ ...message, replyTo: result.data.email });
  } catch (error) {
    console.error("[inquiry] sending failed", error);
    return { status: "error", error: "sendFailed", values };
  }

  return { status: "success" };
}
