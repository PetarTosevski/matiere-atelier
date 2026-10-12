import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminAuthShell, AuthHeading } from "@/components/admin/AdminAuthShell";
import { AdminForgotForm } from "@/components/admin/AdminPasswordForms";
import { routing } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Admin.reset" });
  return { title: t("forgotTitle") };
}

export default async function AdminForgotPage() {
  const [t, tLogin, tAuth] = await Promise.all([
    getTranslations({ locale: routing.defaultLocale, namespace: "Admin.reset" }),
    getTranslations({ locale: routing.defaultLocale, namespace: "Admin.login" }),
    getTranslations({ locale: routing.defaultLocale, namespace: "Auth" }),
  ]);
  return (
    <AdminAuthShell>
      <AuthHeading
        eyebrow={tLogin("eyebrow")}
        heading={t.rich("forgotHeading", { em: (chunks) => <em>{chunks}</em> })}
        lede={t("forgotLede")}
      />
      <AdminForgotForm />
      <Link href="/admin/login" className="link inline-flex min-h-11 items-center text-sm">
        {tAuth("backToSignIn")}
      </Link>
    </AdminAuthShell>
  );
}
