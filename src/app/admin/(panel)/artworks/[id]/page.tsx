import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPreviewContext } from "@/app/admin/preview-context";
import { ArtworkForm } from "@/components/admin/ArtworkForm";
import { routing } from "@/i18n/routing";
import { getArtworkForAdmin } from "@/lib/artworks";
import { requireAdminPage } from "@/lib/auth";

const locale = routing.defaultLocale;

export async function generateMetadata({
  params,
}: PageProps<"/admin/artworks/[id]">): Promise<Metadata> {
  await requireAdminPage();
  const artwork = await getArtworkForAdmin((await params).id);
  const t = await getTranslations({ locale, namespace: "Admin.form" });
  return { title: artwork ? t("editTitle", { title: artwork.title }) : t("newTitle") };
}

export default async function EditArtworkPage({ params }: PageProps<"/admin/artworks/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  const [t, artwork, preview] = await Promise.all([
    getTranslations({ locale, namespace: "Admin.form" }),
    getArtworkForAdmin(id),
    getPreviewContext(id),
  ]);
  if (!artwork) notFound();

  return (
    <div>
      <h1 className="text-2xl tracking-tight md:text-3xl">
        {t("editTitle", { title: artwork.title })}
      </h1>
      <ArtworkForm artwork={artwork} preview={preview} />
    </div>
  );
}
