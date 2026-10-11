"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef } from "react";
import { submitInquiry, type InquiryState } from "@/app/actions/inquiry";
import { HONEYPOT_FIELD, inquiryFields, type InquiryField } from "@/lib/inquiry";
import type { InquiryType } from "@/lib/types";

type Props = {
  type: InquiryType;
  /** Extra values sent with the form, such as the artwork or cart IDs. */
  hidden?: Record<string, string | string[]>;
  onSuccess?: () => void;
  onCartChanged?: () => void;
};

const MULTILINE: readonly InquiryField[] = ["message", "description"];
const OPTIONAL: Partial<Record<InquiryType, readonly InquiryField[]>> = {
  COMMISSION: ["budget"],
  ORDER: ["message"],
};
const AUTOCOMPLETE: Partial<Record<InquiryField, string>> = {
  name: "name",
  email: "email",
};

const initialState: InquiryState = { status: "idle" };

/** The one form behind Contact, Commissions, Request and Checkout. */
export function InquiryForm({ type, hidden = {}, onSuccess, onCartChanged }: Props) {
  const t = useTranslations("Form");
  const locale = useLocale();
  const id = useId();
  const [state, formAction, pending] = useActionState(submitInquiry, initialState);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      successRef.current?.focus();
      onSuccess?.();
    }
    if (state.status === "error") {
      summaryRef.current?.focus();
      if (state.error === "cartChanged") onCartChanged?.();
    }
    // Only react to a new result, not to new callback identities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state.status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="focus:outline-none">
        <h2 className="text-xl">{t("success.title")}</h2>
        <p className="mt-2 text-muted">{t("success.body", { type })}</p>
      </div>
    );
  }

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const optional = OPTIONAL[type] ?? [];

  return (
    <form action={formAction} noValidate className="max-w-xl space-y-6">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="locale" value={locale} />
      {Object.entries(hidden).flatMap(([name, value]) =>
        (Array.isArray(value) ? value : [value]).map((item) => (
          <input key={`${name}-${item}`} type="hidden" name={name} value={item} />
        )),
      )}

      <div ref={summaryRef} tabIndex={-1} role="alert" className="focus:outline-none">
        {state.status === "error" && (
          <p className="border-l-2 border-ink pl-3">{t("formErrors", { error: state.error })}</p>
        )}
      </div>

      {inquiryFields[type].map((field) => {
        const fieldId = `${id}-${field}`;
        const error = errors[field];
        const isOptional = optional.includes(field);
        const describedBy = [
          `${fieldId}-hint`,
          error ? `${fieldId}-error` : null,
        ]
          .filter(Boolean)
          .join(" ");
        const common = {
          id: fieldId,
          name: field,
          defaultValue: values[field] ?? "",
          required: !isOptional,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy,
          autoComplete: AUTOCOMPLETE[field],
          className:
            "mt-2 block w-full border border-ink/40 bg-field px-3 py-2.5 aria-[invalid=true]:border-ink aria-[invalid=true]:border-2",
        };

        return (
          <div key={field}>
            <label htmlFor={fieldId} className="block">
              {t(`fields.${field}.label`)}
              {isOptional && <span className="text-muted"> {t("optional")}</span>}
            </label>
            <p id={`${fieldId}-hint`} className="mt-1 text-sm text-muted">
              {t(`fields.${field}.hint`, { type })}
            </p>
            {MULTILINE.includes(field) ? (
              <textarea {...common} rows={6} />
            ) : (
              <input {...common} type={field === "email" ? "email" : "text"} />
            )}
            {error && (
              <p id={`${fieldId}-error`} className="mt-2 text-sm">
                {t(`errors.${error}`)}
              </p>
            )}
          </div>
        );
      })}

      {/* Honeypot: hidden from people and assistive tech, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-${HONEYPOT_FIELD}`}>{t("honeypot")}</label>
        <input
          id={`${id}-${HONEYPOT_FIELD}`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <button type="submit" disabled={pending} className="button-primary w-full sm:w-auto">
        {pending ? t("sending") : t("submit", { type })}
      </button>
    </form>
  );
}
