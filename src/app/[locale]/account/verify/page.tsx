import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VerifyEmailForm } from "@/components/account/VerifyEmailForm";
import { toLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { areAccountsAvailable } from "@/lib/customer-auth";
import { checkResetToken } from "@/lib/password-reset";

export async function generateMetadata({ params }: PageProps<"/[locale]/account/verify">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: t("verifyMetaTitle"), robots: { index: false }, referrer: "no-referrer" };
}

/** Opened from the verification email. The token is checked again when the button is pressed. */
export default async function VerifyEmailPage({ params, searchParams }: PageProps<"/[locale]/account/verify">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, { token }] = await Promise.all([getTranslations("Account"), searchParams]);
  const subject = typeof token === "string" && areAccountsAvailable() ? await checkResetToken(token) : null;
  const valid = typeof token === "string" && Boolean(subject?.startsWith("verify:"));

  return (
    <div className="site-container pt-12 pb-24 md:pt-16">
      <div className="max-w-[26rem] space-y-8">
        <h1 className="heading-display">{t.rich("verifyHeading", { em: (chunks) => <em>{chunks}</em> })}</h1>
        {valid ? (
          <>
            <p className="text-muted">{t("verifyLede")}</p>
            <VerifyEmailForm token={token as string} />
          </>
        ) : (
          <>
            <p>{t("verifyExpired")}</p>
            <Link href="/login" className="button-primary">
              {t("signIn")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
