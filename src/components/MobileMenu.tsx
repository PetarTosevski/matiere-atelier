"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

type Props = {
  openLabel: string;
  closeLabel: string;
  children: ReactNode;
};

/** The small-screen menu: a disclosure button and a panel under the header. */
export function MobileMenu({ openLabel, closeLabel, children }: Props) {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  // Forget a menu opened on another page, so it doesn't reopen on return.
  if (openOn !== null && openOn !== pathname) setOpenOn(null);
  const isOpen = openOn === pathname;
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenOn(null);
        buttonRef.current?.focus();
      }
    }
    // Also close when a link to the current page is chosen.
    function onClick(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest("a")) {
        setOpenOn(null);
      }
    }

    // Close when Tab moves focus past the panel, so it can't hide the
    // focused element underneath.
    function onFocusOut(event: FocusEvent) {
      const next = event.relatedTarget;
      if (
        next instanceof Node &&
        !panel?.contains(next) &&
        !buttonRef.current?.contains(next)
      ) {
        setOpenOn(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    panel?.addEventListener("click", onClick);
    panel?.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      panel?.removeEventListener("click", onClick);
      panel?.removeEventListener("focusout", onFocusOut);
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isOpen ? closeLabel : openLabel}
        onClick={() => setOpenOn(isOpen ? null : pathname)}
        className="-mr-2.5 flex size-11 items-center justify-center"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-[1.375rem]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          {isOpen ? (
            <path d="M6 6l12 12M18 6 6 18" />
          ) : (
            <path d="M4 8h16M4 16h16" />
          )}
        </svg>
      </button>
      <div
        ref={panelRef}
        id={panelId}
        hidden={!isOpen}
        className="absolute inset-x-0 top-full z-20 h-[calc(100dvh-100%)] overflow-y-auto border-t border-line bg-paper"
      >
        <div className="site-container flex flex-col gap-10 pt-6 pb-10">
          {children}
        </div>
      </div>
    </div>
  );
}
