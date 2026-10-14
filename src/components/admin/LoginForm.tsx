"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState, type ReactNode } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";
import { AdminCodeForm } from "@/components/auth/AdminCodeForm";
import { Checkbox, FormAlert, PasswordField, TextField } from "@/components/auth/fields";

const initialState: LoginState = { error: null };

/** Password first; then the code emailed to the admin (lib/admin-code.ts). */
export function LoginForm({ heading }: { heading: ReactNode }) {
  const t = useTranslations("Admin.login");
  const tCode = useTranslations("Admin.code");
  const tAuth = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const error = state.error && t("errors", { error: state.error });
  // The code step last left with "Sign in again".
  const [dismissed, setDismissed] = useState<LoginState | null>(null);

  if (state.step === "code" && state !== dismissed) {
    return (
      <AdminCodeForm
        action={formAction}
        pending={pending}
        email={state.email ?? ""}
        error={error}
        startOver={
          <button type="button" onClick={() => setDismissed(state)} className="link inline-flex min-h-11 items-center text-sm">
            {tCode("startOver")}
          </button>
        }
      />
    );
  }

  return (
    <>
      {heading}
      {/* noValidate: an older plain username in ADMIN_USERNAME still signs in. */}
      <form action={formAction} noValidate className="space-y-6">
        <FormAlert>{state !== dismissed && error}</FormAlert>
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
    </>
  );
}
