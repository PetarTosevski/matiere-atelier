import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminAuthShell, AuthHeading } from "@/components/admin/AdminAuthShell";
import { AdminResetForm } from "@/components/admin/AdminPasswordForms";
import { routing } from "@/i18n/routing";
import { isConvexConfigured } from "@/lib/convex";
import { checkResetToken } from "@/lib/password-reset";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Admin.reset" });
  return { title: t("resetTitle") };
}

/** Opened from the reset email. The token is checked again when the form is sent. */
export default async function AdminResetPage({ searchParams }: PageProps<"/admin/reset">) {
  const [t, tLogin] = await Promise.all([
    getTranslations({ locale: routing.defaultLocale, namespace: "Admin.reset" }),
    getTranslations({ locale: routing.defaultLocale, namespace: "Admin.login" }),
  ]);
  const { token } = await searchParams;
  const valid =
    typeof token === "string" && isConvexConfigured() && (await checkResetToken(token)) === "admin";

  return (
    <AdminAuthShell>
      <AuthHeading eyebrow={tLogin("eyebrow")} heading={t.rich("resetHeading", { em: (chunks) => <em>{chunks}</em> })} />
      {valid ? (
        <AdminResetForm token={token} />
      ) : (
        <>
          <p>{t("expired")}</p>
          <Link href="/admin/forgot" className="button-primary w-full">
            {t("requestNew")}
          </Link>
        </>
      )}
    </AdminAuthShell>
  );
}
