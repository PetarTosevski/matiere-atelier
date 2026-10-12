"use client";

import { useTranslations } from "next-intl";
import { useActionState, type ReactNode } from "react";
import { FormAlert, FormSuccess, TextField } from "./fields";

export type ForgotPasswordState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; error: string; email: string };

type Props = {
  /** Extra fields sent with the form, such as the locale. */
  hidden?: Record<string, string>;
  action: (previous: ForgotPasswordState, form: FormData) => Promise<ForgotPasswordState>;
  /** The confirmation, given the address the link went to. */
  sent: (email: string) => ReactNode;
  /** The message for an error key. */
  errorMessage: (error: string) => ReactNode;
  submit: string;
  submitting: string;
  emailAutoComplete?: string;
};

/** "Send reset link": the same form for the admin and for customers. */
export function ForgotPasswordForm({ hidden = {}, action, sent, errorMessage, submit, submitting, emailAutoComplete = "email" }: Props) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as ForgotPasswordState);

  return (
    <form action={formAction} noValidate className="space-y-6">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state.status === "sent" && <FormSuccess>{sent(state.email)}</FormSuccess>}
      <FormAlert>{state.status === "error" && errorMessage(state.error)}</FormAlert>
      <TextField
        label={t("email")}
        name="email"
        type="email"
        autoComplete={emailAutoComplete}
        defaultValue={state.status === "idle" ? "" : state.email}
        error={state.status === "error" && state.error === "invalidEmail" ? "invalidEmail" : undefined}
      />
      <button type="submit" disabled={pending} className="button-primary w-full">
        {pending ? submitting : submit}
      </button>
    </form>
  );
}
