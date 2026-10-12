"use client";

import { useLocale, useTranslations } from "next-intl";
import { signOutAction } from "@/app/actions/account";
import { accountStore } from "./account-store";

export function SignOutButton({ className }: { className?: string }) {
  const t = useTranslations("AccountLink");
  const locale = useLocale();
  return (
    <form action={signOutAction} onSubmit={() => accountStore.clear()}>
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className={className}>
        {t("signOut")}
      </button>
    </form>
  );
}
