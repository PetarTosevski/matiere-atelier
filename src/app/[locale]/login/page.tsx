import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountHintSync } from "@/components/account/AccountHintSync";
import { LoginScreen, type LoginView } from "@/components/account/LoginScreen";
import { toLocale } from "@/i18n/locale";
import { getCustomer } from "@/lib/customer-auth";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: t("loginMetaTitle"), robots: { index: false } };
}

const VIEWS: LoginView[] = ["signin", "create", "forgot"];

/** Collector sign-in. Reads the session cookie, so it renders per request. */
export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, query, customer] = await Promise.all([getTranslations("Account"), searchParams, getCustomer()]);
  // Signed in already (or just now, when the action re-renders this page): the welcome view.
  const signedIn = customer
    ? {
        firstName: customer.firstName,
        name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
        email: customer.email,
      }
    : null;
  const view = VIEWS.find((value) => value === query.view) ?? "signin";

  return (
    <div className="site-container flex flex-wrap items-stretch gap-8 pt-6 pb-24">
      {/* Keeps the header's Login / My account in line with the session. */}
      <AccountHintSync account={signedIn} />
      <section aria-labelledby="account-side" className="flex flex-[1_1_26rem] flex-col justify-between gap-10 bg-well px-6 py-8 sm:px-11 sm:py-12">
        <div className="space-y-4">
          <p className="label-caps font-semibold text-accent">{t("eyebrow")}</p>
          <h2 id="account-side" className="font-serif text-[2.75rem] leading-none">
            {t.rich("sideTitle", { em: (chunks) => <em className="text-accent">{chunks}</em> })}
          </h2>
        </div>
        <ol className="space-y-4.5 leading-normal">
          {(["one", "two", "three"] as const).map((key, index) => (
            <li key={key} className="flex gap-3.5">
              <span aria-hidden="true" className="w-7 flex-none font-serif text-2xl text-accent italic">
                {String(index + 1).padStart(2, "0")}
              </span>
              {t(`perks.${key}`)}
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">{t("guestNote")}</p>
      </section>
      <section className="flex flex-[1_1_28rem] justify-center bg-panel px-6 py-8 sm:px-11 sm:py-12">
        <div className="w-full max-w-[26rem]">
          <LoginScreen initialView={view} resetDone={query.reset === "done"} deleted={query.deleted === "done"}
            verified={query.verified === "done" && signedIn !== null}
            signedIn={signedIn}
          />
        </div>
      </section>
    </div>
  );
}
