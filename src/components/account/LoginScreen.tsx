"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createAccountAction, forgotPasswordAction, signInAction, type SignInState } from "@/app/actions/account";
import { Checkbox, FormAlert, FormSuccess, PasswordField, TextField } from "@/components/auth/fields";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Link } from "@/i18n/navigation";
import { accountStore, type AccountHint } from "./account-store";

export type LoginView = "signin" | "create" | "forgot";

const idle: SignInState = { status: "idle" };

/** Sign in, Create account and Forgot password, then a welcome once signed in. */
export function LoginScreen({
  initialView,
  resetDone,
  deleted,
  verified,
  signedIn,
}: {
  initialView: LoginView;
  resetDone: boolean;
  /** Just deleted their account. */
  deleted: boolean;
  /** Just confirmed their email from the link (and is signed in now). */
  verified: boolean;
  /** Who is signed in, when the page found a session. */
  signedIn: AccountHint | null;
}) {
  const t = useTranslations("Account");
  const tAuth = useTranslations("Auth");
  const locale = useLocale();
  const tabsId = useId();
  const [view, setView] = useState<LoginView>(initialView);
  const [signIn, signInFormAction, signingIn] = useActionState(signInAction, idle);
  const [create, createFormAction, creating] = useActionState(createAccountAction, idle);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const inboxRef = useRef<HTMLHeadingElement>(null);
  // The "check your inbox" notice last dismissed with "Back to sign in".
  const [dismissed, setDismissed] = useState<SignInState | null>(null);

  const done =
    signIn.status === "signedIn"
      ? signIn
      : create.status === "signedIn"
        ? create
        : signedIn && { ...signedIn, created: verified };

  const justSignedIn = signIn.status === "signedIn" || create.status === "signedIn" || verified;
  const sentState = create.status === "verifySent" ? create : signIn.status === "verifySent" ? signIn : null;
  const sent = sentState !== dismissed && sentState?.status === "verifySent" ? sentState : null;
  const firstName = done?.firstName;
  const name = done?.name;
  const email = done?.email;

  useEffect(() => {
    if (firstName === undefined || name === undefined || email === undefined) return;
    accountStore.set({ firstName, name, email });
  }, [firstName, name, email]);

  // Move focus to the welcome only right after signing in, not on page load.
  useEffect(() => {
    if (justSignedIn) doneRef.current?.focus();
  }, [justSignedIn]);

  useEffect(() => {
    if (sent) inboxRef.current?.focus();
  }, [sent]);

  if (done) {
    return (
      <div role="status" className="space-y-6">
        <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-accent text-on-accent">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h1 ref={doneRef} tabIndex={-1} className="heading-display focus:outline-none">
          {done.created
            ? t.rich("welcomeNew", { name: done.firstName, em: (chunks) => <em>{chunks}</em> })
            : t.rich("welcomeBack", { em: (chunks) => <em>{chunks}</em> })}
        </h1>
        <p className="text-muted">{done.created ? t("readyBody") : t("signedInAs", { email: done.email })}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/account" className="button-primary">{t("viewCollection")}</Link>
          <Link href="/originals" className="button-quiet">{t("continueBrowsing")}</Link>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div role="status" className="space-y-6">
        <h1 ref={inboxRef} tabIndex={-1} className="heading-display focus:outline-none">
          {t.rich("checkInboxHeading", { em: (chunks) => <em>{chunks}</em> })}
        </h1>
        <p>
          {t.rich(sent.resent ? "verifyResent" : "verifySent", {
            email: sent.email,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <p className="text-sm text-muted">{t("verifySpam")}</p>
        <button
          type="button"
          onClick={() => {
            setDismissed(sentState);
            setView("signin");
          }}
          className="link inline-flex min-h-11 items-center text-sm"
        >
          {tAuth("backToSignIn")}
        </button>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="heading-display">{t.rich("forgotHeading", { em: (chunks) => <em>{chunks}</em> })}</h1>
          <p className="text-muted">{t("forgotLede")}</p>
        </div>
        <ForgotPasswordForm
          action={forgotPasswordAction}
          hidden={{ locale }}
          sent={(email) => t.rich("linkSent", { email, strong: (chunks) => <strong>{chunks}</strong> })}
          errorMessage={(error) => t("errors", { error })}
          submit={t("sendLink")}
          submitting={t("sending")}
        />
        <button type="button" onClick={() => setView("signin")} className="link inline-flex min-h-11 items-center text-sm">
          {tAuth("backToSignIn")}
        </button>
      </div>
    );
  }

  const isCreate = view === "create";
  const state = isCreate ? create : signIn;
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const tab = (target: "signin" | "create", label: string) => (
    <button
      type="button"
      role="tab"
      id={`${tabsId}-${target}`}
      aria-selected={view === target}
      aria-controls={`${tabsId}-panel`}
      onClick={() => setView(target)}
      className="min-h-13 flex-1 border-b-[3px] border-transparent px-5 font-semibold text-faint aria-selected:border-accent aria-selected:text-ink"
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* The tabs name the page for screen readers; the visual heading is the tab row. */}
      <h1 className="sr-only">{isCreate ? t("createTab") : t("signInTab")}</h1>
      <div role="tablist" aria-label={t("tabsLabel")} className="-mb-px flex border-b border-line">
        {tab("signin", t("signInTab"))}
        {tab("create", t("createTab"))}
      </div>
      <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${view}`} className="space-y-6">
        {resetDone && !isCreate && <FormSuccess>{t("resetDone")}</FormSuccess>}
        {deleted && <FormSuccess>{t("deleted")}</FormSuccess>}
        <FormAlert>{state.status === "error" && t("errors", { error: state.error })}</FormAlert>
        {/* key: switching tabs starts each form fresh. */}
        <form key={view} action={isCreate ? createFormAction : signInFormAction} noValidate className="space-y-5">
          {isCreate && (
            <TextField label={t("firstName")} name="firstName" autoComplete="given-name" defaultValue={values.firstName} error={errors.firstName} />
          )}
          <TextField label={tAuth("email")} name="email" type="email" autoComplete="email" defaultValue={values.email} error={errors.email} />
          <PasswordField
            label={tAuth("password")}
            name="password"
            autoComplete={isCreate ? "new-password" : "current-password"}
            hint={isCreate ? tAuth("passwordHint") : undefined}
            error={errors.password}
          />
          {isCreate ? (
            <Checkbox label={t("newsletter")} name="newsletter" />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <Checkbox label={tAuth("remember")} name="remember" defaultChecked />
              <button type="button" onClick={() => setView("forgot")} className="link inline-flex min-h-11 items-center text-sm">
                {tAuth("forgot")}
              </button>
            </div>
          )}
          <button type="submit" disabled={signingIn || creating} className="button-primary w-full">
            {isCreate ? (creating ? t("creating") : t("create")) : signingIn ? t("signingIn") : t("signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}
