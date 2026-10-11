"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const t = useTranslations("Admin.login");
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div role="alert">
        {state.error && <p className="border-l-2 border-ink pl-3">{t("errors", { error: state.error })}</p>}
      </div>
      <div>
        <label htmlFor="admin-username" className="block">{t("username")}</label>
        <input
          id="admin-username"
          name="username"
          autoComplete="username"
          defaultValue={state.username ?? ""}
          required
          className="mt-2 block w-full border border-ink/40 bg-field px-3 py-2.5"
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="block">{t("password")}</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 block w-full border border-ink/40 bg-field px-3 py-2.5"
        />
      </div>
      <button type="submit" disabled={pending} className="button-primary w-full">
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
