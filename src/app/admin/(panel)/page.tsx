import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CollectionEditor } from "@/components/admin/collection/CollectionEditor";
import { routing } from "@/i18n/routing";
import { getAllArtworksForAdmin } from "@/lib/artworks";
import { requireAdminPage } from "@/lib/auth";
import { toEditorWork } from "@/lib/collection-changes";
import { getSiteSettings } from "@/lib/settings";

const locale = routing.defaultLocale;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Admin.collection" });
  return { title: t("metaTitle") };
}

/**
 * The collection as visitors see it, with editing on top. Admin only: the
 * session is checked here and in every action it calls, so passing the full
 * data (drafts and stored prices included) to the browser is fine.
 */
export default async function AdminCollectionPage({ searchParams }: PageProps<"/admin">) {
  await requireAdminPage();
  const [artworks, settings, { edit }] = await Promise.all([getAllArtworksForAdmin(), getSiteSettings(), searchParams]);
  // ?edit=<slug> comes from the storefront's "Edit this piece" link.
  const editing = typeof edit === "string" ? artworks.find((artwork) => artwork.slug === edit) : undefined;

  return (
    <CollectionEditor
      initialWorks={artworks.map(toEditorWork)}
      initialSettings={settings}
      initialSelectedKey={editing?.id ?? null}
    />
  );
}
