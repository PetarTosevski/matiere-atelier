"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { verifyEmailAction, type VerifyEmailState } from "@/app/actions/account";
import { FormAlert } from "@/components/auth/fields";

const idle: VerifyEmailState = {};

/**
 * One button that confirms the address. A button rather than confirming on
 * page load, so mail scanners that open links don't use the link up.
 */
export function VerifyEmailForm({ token }: { token: string }) {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [state, action, pending] = useActionState(verifyEmailAction, idle);
  return (
    <form action={action} className="space-y-5">
      <FormAlert>{state.error && t("errors", { error: state.error })}</FormAlert>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" disabled={pending} className="button-primary">
        {pending ? t("confirming") : t("confirmEmail")}
      </button>
    </form>
  );
}
