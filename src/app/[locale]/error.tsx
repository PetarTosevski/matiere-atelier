"use client";

import { useTranslations } from "next-intl";
import { ErrorView } from "@/components/ErrorView";

// A server error (Convex unreachable, for example) shows this inside the
// layout instead of the bare Next.js error screen.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("ErrorPage");
  return <ErrorView error={error} retry={retry} copy={{ title: t("title"), body: t("body"), retry: t("retry") }} />;
}
