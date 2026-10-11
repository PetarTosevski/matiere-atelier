import { useTranslations } from "next-intl";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <PlaceholderPage title={t("title")}>
      <p>{t("body")}</p>
      <p className="mt-8">
        <Link href="/originals" className="link text-ink">
          {t("backToOriginals")}
        </Link>
      </p>
    </PlaceholderPage>
  );
}
