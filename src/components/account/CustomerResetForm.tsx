"use client";

import { useLocale, useTranslations } from "next-intl";
import { resetPasswordAction } from "@/app/actions/account";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export function CustomerResetForm({ token }: { token: string }) {
  const t = useTranslations("Account");
  const locale = useLocale();
  return (
    <NewPasswordForm
      action={resetPasswordAction}
      hidden={{ locale }}
      token={token}
      errorMessage={(error) => t("errors", { error })}
      submit={t("saveNewPassword")}
      submitting={t("saving")}
    />
  );
}
