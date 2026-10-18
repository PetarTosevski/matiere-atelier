"use client";

import "./globals.css";
import { fontVariables } from "@/app/fonts";
import { ErrorView } from "@/components/ErrorView";
import { routing } from "@/i18n/routing";
import messages from "../../messages/en.json";

// Replaces the root layout when a layout itself fails, so there is no
// translation provider here: the copy comes straight from the default locale.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang={routing.defaultLocale} className={fontVariables}>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <ErrorView error={error} retry={retry} copy={messages.ErrorPage} />
      </body>
    </html>
  );
}
