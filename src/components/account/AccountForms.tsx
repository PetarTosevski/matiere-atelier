"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { changePasswordAction, updateDetailsAction, type FormState } from "@/app/actions/account";
import { Checkbox, FormAlert, FormSuccess, PasswordField, TextField } from "@/components/auth/fields";
import { accountStore } from "./account-store";

type Props = { email: string; firstName: string; lastName: string; newsletter: boolean };

const idle: FormState = { status: "idle" };

/** Account details and Change password. */
export function AccountForms({ email, firstName, lastName, newsletter }: Props) {
  const t = useTranslations("Account");
  const tAuth = useTranslations("Auth");
  const locale = useLocale();

  const [details, detailsAction, savingDetails] = useActionState(async (previous: FormState, form: FormData) => {
    form.set("locale", locale);
    const result = await updateDetailsAction(previous, form);
    if (result.status === "saved") {
      const first = String(form.get("firstName") ?? "").trim();
      const last = String(form.get("lastName") ?? "").trim();
      accountStore.set({ firstName: first, name: [first, last].filter(Boolean).join(" "), email });
    }
    return result;
  }, idle);

  const [password, passwordAction, savingPassword] = useActionState(async (previous: FormState, form: FormData) => {
    form.set("locale", locale);
    return changePasswordAction(previous, form);
  }, idle);

  const detailErrors = details.status === "error" ? (details.fieldErrors ?? {}) : {};
  const passwordErrors = password.status === "error" ? (password.fieldErrors ?? {}) : {};

  return (
    <div className="flex flex-col gap-8 pt-9">
      <form action={detailsAction} noValidate className="flex max-w-[47.5rem] flex-col gap-5.5 bg-panel px-6 py-8 sm:px-10 sm:py-9">
        <FormAlert>{details.status === "error" && t("errors", { error: details.error })}</FormAlert>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label={t("firstName")} name="firstName" autoComplete="given-name" defaultValue={firstName} error={detailErrors.firstName} />
          <TextField label={t("lastName")} name="lastName" autoComplete="family-name" defaultValue={lastName} error={detailErrors.lastName} />
        </div>
        <div>
          <p>{t("emailLabel")}</p>
          <p className="mt-2 font-semibold break-all">{email}</p>
          <p className="mt-1 text-sm text-muted">{t("emailNote")}</p>
        </div>
        <Checkbox label={t("newsletter")} name="newsletter" defaultChecked={newsletter} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={savingDetails} className="button-primary">
            {t("saveChanges")}
          </button>
          {details.status === "saved" && <FormSuccess>{t("saved")}</FormSuccess>}
        </div>
      </form>

      <form action={passwordAction} noValidate className="flex max-w-[47.5rem] flex-col gap-5.5 bg-panel px-6 py-8 sm:px-10 sm:py-9">
        <h2 className="font-serif text-3xl">{t("changePassword")}</h2>
        <FormAlert>{password.status === "error" && t("errors", { error: password.error })}</FormAlert>
        {/* A hidden username helps password managers save the new password. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <PasswordField label={tAuth("currentPassword")} name="current" autoComplete="current-password" error={passwordErrors.current} />
        <PasswordField label={tAuth("newPassword")} name="password" autoComplete="new-password" hint={tAuth("passwordHint")} error={passwordErrors.password} />
        <PasswordField label={tAuth("confirmPassword")} name="confirm" autoComplete="new-password" error={passwordErrors.confirm} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={savingPassword} className="button-quiet">
            {t("changePassword")}
          </button>
          {password.status === "saved" && <FormSuccess>{t("passwordChanged")}</FormSuccess>}
        </div>
      </form>
    </div>
  );
}
