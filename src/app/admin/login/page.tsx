import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminAuthShell, AuthHeading } from "@/components/admin/AdminAuthShell";
import { LoginForm } from "@/components/admin/LoginForm";
import { FormSuccess } from "@/components/auth/fields";
import { routing } from "@/i18n/routing";
import { isAdmin } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Admin.login" });
  return { title: t("title") };
}

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await isAdmin()) redirect("/admin");
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Admin.login" });
  const { reset } = await searchParams;

  return (
    <AdminAuthShell>
      <LoginForm
        heading={
          <>
            <AuthHeading
              eyebrow={t("eyebrow")}
              heading={t.rich("heading", { em: (chunks) => <em>{chunks}</em> })}
              lede={t("lede")}
            />
            {reset === "done" && <FormSuccess>{t("resetDone")}</FormSuccess>}
          </>
        }
      />
      <p className="text-sm text-muted">{t("ownerOnly")}</p>
    </AdminAuthShell>
  );
}
