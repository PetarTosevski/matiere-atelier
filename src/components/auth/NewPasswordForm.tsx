"use client";

import { useTranslations } from "next-intl";
import { useActionState, type ReactNode } from "react";
import type { AccountFieldErrors } from "@/lib/account-forms";
import { FormAlert, PasswordField } from "./fields";

export type NewPasswordState = { error: string | null; fieldErrors?: AccountFieldErrors };

type Props = {
  /** Extra fields sent with the form, such as the locale. */
  hidden?: Record<string, string>;
  action: (previous: NewPasswordState, form: FormData) => Promise<NewPasswordState>;
  token: string;
  errorMessage: (error: string) => ReactNode;
  submit: string;
  submitting: string;
};

/** The page a reset link opens: a new password, typed twice. */
export function NewPasswordForm({ hidden = {}, action, token, errorMessage, submit, submitting }: Props) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(action, { error: null } as NewPasswordState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="space-y-6">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="token" value={token} />
      <FormAlert>{state.error && errorMessage(state.error)}</FormAlert>
      <PasswordField label={t("newPassword")} name="password" autoComplete="new-password" hint={t("passwordHint")} error={errors.password} />
      <PasswordField label={t("confirmPassword")} name="confirm" autoComplete="new-password" error={errors.confirm} />
      <button type="submit" disabled={pending} className="button-primary w-full">
        {pending ? submitting : submit}
      </button>
    </form>
  );
}
