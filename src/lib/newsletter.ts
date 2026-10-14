import "server-only";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getArtworksByIds } from "@/lib/artworks";
import { api, convexMutation, convexQuery, isConvexConfigured } from "@/lib/convex";
import { formatPrice } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { buildNewWorkEmail, type NewWorkPiece } from "@/lib/new-work-email";
import { getPriceView } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/settings";
import { getSiteUrl, SITE_NAME } from "@/lib/site";
import { isValidUnsubscribe, unsubscribeToken } from "@/lib/unsubscribe";

// "Email me when new work is released": when a Publish puts pieces on the site
// for the first time (artworks:applyChanges reports them), every subscriber
// gets one email about all of them, from newsletter@ (MAIL_FROM_NEWSLETTER).
// Subscribers are accounts that ticked the box and confirmed their address.
// Each email goes to one person (nobody sees the others' addresses) and has
// its own unsubscribe link, also in the List-Unsubscribe header so mail apps
// show their own Unsubscribe button.

/** Emails subscribers about pieces that just went on the site. Never throws. */
export async function announceNewWork(artworkIds: string[]): Promise<void> {
  if (artworkIds.length === 0 || !isConvexConfigured()) return;
  try {
    const [subscribers, artworks, settings] = await Promise.all([
      convexQuery(api.customers.newsletterSubscribers, {}),
      getArtworksByIds(artworkIds),
      getSiteSettings(),
    ]);
    const published = artworks.filter((artwork) => artwork.published);
    if (subscribers.length === 0 || published.length === 0) return;

    const locale = routing.defaultLocale;
    const origin = getSiteUrl().origin;
    const t = await getTranslations({ locale, namespace: "NewWorkEmail" });
    const tArtwork = await getTranslations({ locale, namespace: "Artwork" });

    const pieces: NewWorkPiece[] = published.map((artwork) => {
      const cover = artwork.images[0];
      // The price only when the site shows it, by the same rules (CLAUDE.md).
      const { price } = getPriceView(artwork, settings);
      return {
        title: artwork.title,
        url: `${origin}/${locale}/originals/${artwork.slug}`,
        // Resized by Next.js, so subscribers don't each download the full upload.
        image: cover
          ? { ...cover, src: `${origin}/_next/image?url=${encodeURIComponent(cover.src)}&w=1080&q=80` }
          : null,
        dimensions: artwork.dimensions ? tArtwork("dimensions", artwork.dimensions) : null,
        price: price ? formatPrice(price.amount, price.currency, locale) : null,
      };
    });

    let sent = 0;
    for (const subscriber of subscribers) {
      const token = unsubscribeToken(subscriber.id);
      const unsubscribeUrl = `${origin}/${locale}/unsubscribe?c=${subscriber.id}&t=${token}`;
      const message = buildNewWorkEmail(
        { origin, locale, siteName: SITE_NAME, firstName: subscriber.firstName, pieces, unsubscribeUrl },
        (key, values) => t(key as never, values as never),
      );
      try {
        await sendMail({
          ...message,
          to: subscriber.email,
          sender: "newsletter",
          headers: {
            "List-Unsubscribe": `<${origin}/api/unsubscribe?c=${subscriber.id}&t=${token}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        sent += 1;
      } catch (error) {
        console.error("[newsletter] sending failed for one subscriber", error);
      }
    }
    console.info(`[newsletter] new work emailed to ${sent} of ${subscribers.length} subscribers`);
  } catch (error) {
    console.error("[newsletter] announcing new work failed", error);
  }
}

/** Turns the newsletter off for the account in an unsubscribe link; false when the link is not genuine. */
export async function unsubscribe(customerId: string, token: string): Promise<boolean> {
  if (!isValidUnsubscribe(customerId, token)) return false;
  await convexMutation(api.customers.unsubscribe, { id: customerId });
  return true;
}
