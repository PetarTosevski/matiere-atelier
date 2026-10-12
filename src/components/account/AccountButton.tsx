"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import { accountStore } from "./account-store";
import { SignOutButton } from "./SignOutButton";

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.1em]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

const MENU_ITEM = "flex min-h-11 w-full items-center px-4 py-3 text-left normal-case tracking-normal hover:text-accent";

/**
 * "Login" for visitors, "My account" with a small menu once signed in. Pages
 * are static, so this reads the browser's hint (account-store) rather than
 * the session; the account pages check the session themselves.
 */
export function AccountButton() {
  const t = useTranslations("AccountLink");
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointer(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onFocusOut(event: FocusEvent) {
      if (event.relatedTarget instanceof Node && !wrapperRef.current?.contains(event.relatedTarget)) setOpen(false);
    }
    const wrapper = wrapperRef.current;
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointer);
    wrapper?.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointer);
      wrapper?.removeEventListener("focusout", onFocusOut);
    };
  }, [open]);

  if (!account) {
    return (
      <Link href="/login" className="inline-flex min-h-10 items-center gap-2 border border-ink px-3.5 hover:border-accent">
        <UserIcon />
        {t("login")}
      </Link>
    );
  }

  const initial = /^[\p{L}\p{N}]/u.test(account.firstName) ? account.firstName[0]!.toUpperCase() : null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-10 items-center gap-2 border border-ink py-1 pr-3.5 pl-1 uppercase aria-expanded:bg-panel"
      >
        <span aria-hidden="true" className="flex size-[1.875rem] items-center justify-center rounded-full bg-accent text-[0.8125rem] font-semibold tracking-normal text-on-accent">
          {initial ?? <UserIcon />}
        </span>
        {t("account")}
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div id={menuId} className="absolute top-[calc(100%+0.5rem)] right-0 z-40 flex w-64 flex-col border border-line bg-panel text-base shadow-[var(--shadow-drawer)]">
          <div className="flex flex-col gap-0.5 border-b border-line px-4 py-4 normal-case tracking-normal">
            <strong className="font-semibold">{account.name}</strong>
            <span className="truncate text-sm text-muted">{account.email}</span>
          </div>
          <Link href="/account" onClick={() => setOpen(false)} className={MENU_ITEM}>
            {t("collection")}
          </Link>
          <Link href="/account?tab=details" onClick={() => setOpen(false)} className={MENU_ITEM}>
            {t("details")}
          </Link>
          <div className="border-t border-line">
            <SignOutButton className={MENU_ITEM} />
          </div>
        </div>
      )}
    </div>
  );
}

/** The same links for the small-screen menu. */
export function AccountMenuLinks() {
  const t = useTranslations("AccountLink");
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const item = "inline-flex min-h-11 items-center hover:text-accent";
  if (!account) {
    return (
      <Link href="/login" className={`${item} gap-2`}>
        <UserIcon />
        {t("login")}
      </Link>
    );
  }
  return (
    <div className="flex flex-col">
      <Link href="/account" className={item}>{t("collection")}</Link>
      <Link href="/account?tab=details" className={item}>{t("details")}</Link>
      <SignOutButton className={`${item} uppercase`} />
    </div>
  );
}
