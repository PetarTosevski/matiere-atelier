"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import type { AccountFieldError } from "@/lib/account-forms";

// Form fields shared by the admin and customer sign-in and account forms.

const INPUT =
  "block w-full border border-ink/40 bg-field px-3 py-2.5 text-ink aria-[invalid=true]:border-2 aria-[invalid=true]:border-accent";

type FieldProps = {
  label: ReactNode;
  name: string;
  error?: AccountFieldError;
  hint?: ReactNode;
};

function useDescribedBy(id: string, hint: unknown, error: unknown) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

function FieldMessages({ id, hint, error }: { id: string; hint?: ReactNode; error?: AccountFieldError }) {
  const t = useTranslations("Auth.errors");
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm">
          {t(error)}
        </p>
      )}
    </>
  );
}

export function TextField({
  label,
  name,
  error,
  hint,
  type = "text",
  autoComplete,
  defaultValue,
}: FieldProps & { type?: "text" | "email"; autoComplete?: string; defaultValue?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        spellCheck={type === "email" ? false : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={useDescribedBy(id, hint, error)}
        className={`mt-2 ${INPUT}`}
      />
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

/** A password input with a Show/Hide button. */
export function PasswordField({
  label,
  name,
  error,
  hint,
  autoComplete,
}: FieldProps & { autoComplete: "current-password" | "new-password" }) {
  const t = useTranslations("Auth");
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block">
        {label}
      </label>
      <div className="mt-2 flex">
        <input
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={useDescribedBy(id, hint, error)}
          className={`min-w-0 flex-1 ${INPUT}`}
        />
        <button
          type="button"
          onClick={() => setShown(!shown)}
          aria-pressed={shown}
          aria-label={shown ? t("hideLabel") : t("showLabel")}
          className="min-h-11 min-w-18 border border-l-0 border-ink/40 bg-field px-3 text-sm font-semibold text-accent"
        >
          {shown ? t("hide") : t("show")}
        </button>
      </div>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

export function Checkbox({ label, name, defaultChecked }: { label: ReactNode; name: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-[1.125rem] accent-accent" />
      {label}
    </label>
  );
}

/** The message at the top of a form; announced when it appears. */
export function FormAlert({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div role="alert">
      {children && <p className={`border-l-2 border-accent pl-3 ${className}`}>{children}</p>}
    </div>
  );
}

/** A confirmation (link sent, password changed). */
export function FormSuccess({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="border-l-2 border-accent pl-3">
      {children}
    </p>
  );
}
