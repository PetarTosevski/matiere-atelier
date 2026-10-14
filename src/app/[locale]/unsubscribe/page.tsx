import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UnsubscribeForm } from "@/components/newsletter/UnsubscribeForm";
import { toLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/unsubscribe">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Unsubscribe" });
  return { title: t("metaTitle"), robots: { index: false }, referrer: "no-referrer" };
}

/** Opened from a new-work email. The link is checked when the button is pressed. */
export default async function UnsubscribePage({ params, searchParams }: PageProps<"/[locale]/unsubscribe">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, { c, t: token }] = await Promise.all([getTranslations("Unsubscribe"), searchParams]);
  const complete = typeof c === "string" && typeof token === "string";

  return (
    <div className="site-container pt-12 pb-24 md:pt-16">
      <div className="max-w-[30rem] space-y-8">
        <h1 className="heading-display">{t.rich("heading", { em: (chunks) => <em>{chunks}</em> })}</h1>
        {complete ? (
          <>
            <p className="text-muted">{t("body")}</p>
            <UnsubscribeForm customerId={c} token={token} />
          </>
        ) : (
          <>
            <p>{t("invalid")}</p>
            <Link href="/originals" className="button-primary">
              {t("browse")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
