"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { FormAlert } from "@/components/auth/fields";

// The admin's second sign-in step (lib/admin-code.ts), on /admin/login and on
// the storefront's /login: the 6-digit code from the email.

type Props = {
  action: (form: FormData) => void;
  pending: boolean;
  email: string;
  error?: ReactNode;
  /** Back to the password step; a new sign-in sends a new code. */
  startOver: ReactNode;
};

export function AdminCodeForm({ action, pending, email, error, startOver }: Props) {
  const t = useTranslations("Admin.code");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  // Ready to type (or paste) as soon as the step appears, and again after a wrong code.
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, [error]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="heading-display">{t.rich("heading", { em: (chunks) => <em>{chunks}</em> })}</h1>
        <p className="text-muted">{t("lede", { email })}</p>
      </div>
      <form action={action} noValidate className="space-y-6">
        <FormAlert>{error}</FormAlert>
        <div>
          <label htmlFor={id} className="block">
            {t("label")}
          </label>
          <input
            ref={input}
            id={id}
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={7}
            aria-invalid={error ? true : undefined}
            className="mt-2 block w-full border border-ink/40 bg-field px-3 py-2.5 font-serif text-2xl tracking-[0.4em] text-ink aria-[invalid=true]:border-2 aria-[invalid=true]:border-accent"
          />
        </div>
        <button type="submit" disabled={pending} className="button-primary w-full">
          {pending ? t("submitting") : t("submit")}
        </button>
      </form>
      {startOver}
    </div>
  );
}
