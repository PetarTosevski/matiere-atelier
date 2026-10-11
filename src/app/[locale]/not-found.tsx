import { useTranslations } from "next-intl";
import { SimplePage } from "@/components/SimplePage";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <SimplePage title={t("title")}>
      <p>{t("body")}</p>
      <p className="mt-8">
        <Link href="/originals" className="link text-ink">
          {t("backToOriginals")}
        </Link>
      </p>
    </SimplePage>
  );
}
