"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";
import { Checkbox, FormAlert, PasswordField, TextField } from "@/components/auth/fields";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const t = useTranslations("Admin.login");
  const tAuth = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    // noValidate: an older plain username in ADMIN_USERNAME still signs in.
    <form action={formAction} noValidate className="space-y-6">
      <FormAlert>{state.error && t("errors", { error: state.error })}</FormAlert>
      {/* The admin's email doubles as the username for password managers. */}
      <TextField label={tAuth("email")} name="email" type="email" autoComplete="username" defaultValue={state.email ?? ""} />
      <PasswordField label={tAuth("password")} name="password" autoComplete="current-password" />
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <Checkbox label={tAuth("remember")} name="remember" defaultChecked />
        <Link href="/admin/forgot" className="link inline-flex min-h-11 items-center text-sm">
          {tAuth("forgot")}
        </Link>
      </div>
      <button type="submit" disabled={pending} className="button-primary w-full">
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
