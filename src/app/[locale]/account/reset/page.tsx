import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CustomerResetForm } from "@/components/account/CustomerResetForm";
import { toLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { areAccountsAvailable } from "@/lib/customer-auth";
import { checkResetToken } from "@/lib/password-reset";

export async function generateMetadata({ params }: PageProps<"/[locale]/account/reset">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: t("resetMetaTitle"), robots: { index: false }, referrer: "no-referrer" };
}

/** Opened from the reset email. The token is checked again when the form is sent. */
export default async function AccountResetPage({ params, searchParams }: PageProps<"/[locale]/account/reset">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, { token }] = await Promise.all([getTranslations("Account"), searchParams]);
  const subject = typeof token === "string" && areAccountsAvailable() ? await checkResetToken(token) : null;
  const valid = typeof token === "string" && Boolean(subject?.startsWith("customer:"));

  return (
    <div className="site-container pt-12 pb-24 md:pt-16">
      <div className="max-w-[26rem] space-y-8">
        <h1 className="heading-display">{t.rich("resetHeading", { em: (chunks) => <em>{chunks}</em> })}</h1>
        {valid ? (
          <CustomerResetForm token={token} />
        ) : (
          <>
            <p>{t("resetExpired")}</p>
            <Link href="/login?view=forgot" className="button-primary">
              {t("requestNewLink")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
