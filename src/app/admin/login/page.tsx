import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { routing } from "@/i18n/routing";
import { isAdmin } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Admin.login" });
  return { title: t("title") };
}

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Admin.login" });

  return (
    <main className="site-container py-16">
      <div className="max-w-sm">
        <h1 className="text-2xl tracking-tight">{t("title")}</h1>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
