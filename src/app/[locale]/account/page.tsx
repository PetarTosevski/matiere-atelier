import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountForms } from "@/components/account/AccountForms";
import { AccountHintSync } from "@/components/account/AccountHintSync";
import { SignOutButton } from "@/components/account/SignOutButton";
import { toLocale } from "@/i18n/locale";
import { Link, redirect } from "@/i18n/navigation";
import { getArtworksByIds } from "@/lib/artworks";
import { isAdminEmail } from "@/lib/admin-account";
import { getCustomer } from "@/lib/customer-auth";
import { formatPrice } from "@/lib/format";
import { getCustomerOrders } from "@/lib/inquiries";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: t("accountMetaTitle"), robots: { index: false } };
}

/** The signed-in collector's page: their orders, and their details. */
export default async function AccountPage({ params, searchParams }: PageProps<"/[locale]/account">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const customer = await getCustomer();
  if (!customer) return redirect({ href: "/login", locale });

  const [t, { tab }] = await Promise.all([getTranslations("Account"), searchParams]);
  const showDetails = tab === "details";
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  const tabClass =
    "inline-flex min-h-13 items-center whitespace-nowrap border-b-[3px] border-transparent px-5 font-semibold text-faint aria-[current=page]:border-accent aria-[current=page]:text-ink";

  return (
    <div className="site-container pb-24">
      <AccountHintSync account={{ firstName: customer.firstName, name, email: customer.email }} />
      <div className="mt-10 mb-9 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div>
          <p className="label-caps font-semibold text-accent">{t("eyebrow")}</p>
          <h1 className="heading-display mt-2">{t.rich("hello", { name: customer.firstName, em: (chunks) => <em>{chunks}</em> })}</h1>
        </div>
        <SignOutButton className="link inline-flex min-h-11 items-center text-sm" />
      </div>

      <nav aria-label={t("sectionsLabel")} className="flex gap-2 overflow-x-auto border-b border-line">
        <Link href="/account" aria-current={showDetails ? undefined : "page"} className={tabClass}>
          {t("collectionTab")}
        </Link>
        <Link href="/account?tab=details" aria-current={showDetails ? "page" : undefined} className={tabClass}>
          {t("detailsTab")}
        </Link>
      </nav>

      {showDetails ? (
        <AccountForms
          email={customer.email}
          firstName={customer.firstName}
          lastName={customer.lastName}
          newsletter={customer.newsletter}
          canDelete={!isAdminEmail(customer.email)}
        />
      ) : (
        <Collection customerId={customer.id} locale={locale} />
      )}
    </div>
  );
}

async function Collection({ customerId, locale }: { customerId: Parameters<typeof getCustomerOrders>[0]; locale: string }) {
  const t = await getTranslations("Account");
  const orders = await getCustomerOrders(customerId);
  const ids = [...new Set(orders.flatMap((order) => order.items.map((item) => item.artworkId)))];
  // Current artworks, for the picture and link; only pieces still on the site.
  const live = new Map(
    (ids.length > 0 ? await getArtworksByIds(ids) : [])
      .filter((artwork) => artwork.published)
      .map((artwork) => [artwork.id, artwork]),
  );
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const rows = orders.flatMap((order) => order.items.map((item) => ({ ...item, orderId: order.id, createdAt: order.createdAt })));

  if (rows.length === 0) {
    return (
      <div className="pt-9">
        <p className="text-muted">{t("ordersEmpty")}</p>
        <Link href="/originals" className="button-primary mt-6">
          {t("browseOriginals")}
        </Link>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4 pt-9">
      <ul className="flex flex-col gap-4">
        {rows.map((row) => {
          const artwork = live.get(row.artworkId);
          const cover = artwork?.images[0];
          return (
            <li key={`${row.orderId}-${row.artworkId}`} className="flex flex-wrap items-center gap-x-7 gap-y-5 bg-panel px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex size-26 flex-none items-center justify-center bg-well">
                {cover && (
                  <Image
                    src={cover.src}
                    width={cover.width}
                    height={cover.height}
                    alt={cover.alt || row.title}
                    sizes="5rem"
                    className="h-auto max-h-20 w-auto max-w-22 object-contain shadow-[var(--shadow-art)]"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-[1_1_16rem] flex-col gap-1.5">
                <h2 className="font-serif text-[1.75rem] font-medium">
                  {artwork ? <Link href={`/originals/${artwork.slug}`}>{row.title}</Link> : row.title}
                </h2>
                <span className="text-sm text-muted">{t("orderSent", { date: date.format(new Date(row.createdAt)) })}</span>
                {!artwork && <span className="text-sm text-muted">{t("pieceGone")}</span>}
              </div>
              <div className="flex flex-col items-start gap-2.5">
                <span className="inline-flex items-center gap-2 border border-control bg-field px-3 py-1.5 text-sm font-semibold">
                  {t("orderStatus")}
                </span>
                <span className="font-semibold whitespace-nowrap">{formatPrice(row.amount, row.currency, locale)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-muted">{t("orderNote")}</p>
      <p className="text-sm text-muted">
        {t.rich("questions", { contact: (chunks) => <Link href="/contact" className="link">{chunks}</Link> })}
      </p>
    </section>
  );
}
