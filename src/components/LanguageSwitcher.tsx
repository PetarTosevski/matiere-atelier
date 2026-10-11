"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Lists every locale; switching keeps the visitor on the same page. */
export function LanguageSwitcher() {
  const t = useTranslations("LanguageSwitcher");
  const currentLocale = useLocale();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="flex items-center gap-2"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[1.1em] shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9Z" />
      </svg>
      <ul className="flex gap-4">
        {routing.locales.map((locale) => (
        <li key={locale}>
          {locale === currentLocale ? (
            <span aria-current="true" className="underline underline-offset-8">
              {t("locale", { locale })}
            </span>
          ) : (
            <Link
              href={pathname}
              locale={locale}
              lang={locale}
              hrefLang={locale}
              className="underline-offset-8 hover:underline"
            >
              {t("locale", { locale })}
            </Link>
          )}
        </li>
        ))}
      </ul>
    </div>
  );
}
