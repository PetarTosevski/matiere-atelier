"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile: a bot check that runs in the background. With
// appearance "interaction-only" nothing shows unless Cloudflare wants the
// visitor to tick a box, which is rare. The widget adds a hidden
// "cf-turnstile-response" field to the surrounding form; the server action
// checks it (lib/turnstile.ts). Without NEXT_PUBLIC_TURNSTILE_SITE_KEY this
// renders nothing and the server skips the check.

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's script once per page, on the first form that needs it. */
function loadTurnstile(): Promise<TurnstileApi> {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type Props = {
  /** Shown in Cloudflare's analytics, e.g. "inquiry" or "create-account". */
  action: string;
  /** A token works once: pass the form's result so a new one is fetched after each try. */
  resetOn: unknown;
};

export function Turnstile({ action, resetOn }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !container.current) return;
    const element = container.current;
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) return;
        widget.current = turnstile.render(element, {
          sitekey: siteKey,
          action,
          appearance: "interaction-only",
          theme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
        });
      })
      // Blocked by an extension, say: the server will refuse and say so.
      .catch((error) => console.warn("[turnstile]", error));
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, action]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [resetOn]);

  if (!siteKey) return null;
  // Empty unless Cloudflare asks for a click; then the checkbox appears here.
  return <div ref={container} className="empty:hidden" />;
}
