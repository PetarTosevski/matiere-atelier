"use client";

import { useTranslations } from "next-intl";
import { forgotPasswordAction, resetPasswordAction } from "@/app/admin/actions";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export function AdminForgotForm() {
  const t = useTranslations("Admin.reset");
  return (
    <ForgotPasswordForm
      action={forgotPasswordAction}
      emailAutoComplete="username"
      sent={(email) => t.rich("sent", { email, strong: (chunks) => <strong>{chunks}</strong> })}
      errorMessage={(error) => t("errors", { error })}
      submit={t("send")}
      submitting={t("sending")}
    />
  );
}

export function AdminResetForm({ token }: { token: string }) {
  const t = useTranslations("Admin.reset");
  return (
    <NewPasswordForm
      action={resetPasswordAction}
      token={token}
      errorMessage={(error) => t("errors", { error })}
      submit={t("save")}
      submitting={t("saving")}
    />
  );
}
