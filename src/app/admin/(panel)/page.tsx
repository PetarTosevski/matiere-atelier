import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { moveArtworkAction, setStatusAction } from "@/app/admin/actions";
import { getPreviewContext } from "@/app/admin/preview-context";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { ListPreviewButton } from "@/components/admin/ListPreviewButton";
import { routing } from "@/i18n/routing";
import { getAllArtworksForAdmin } from "@/lib/artworks";
import { requireAdminPage } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

const locale = routing.defaultLocale;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Admin.list" });
  return { title: t("title") };
}

export default async function AdminArtworksPage({ searchParams }: PageProps<"/admin">) {
  await requireAdminPage();
  const [t, artworks, params, preview] = await Promise.all([
    getTranslations({ locale, namespace: "Admin.list" }),
    getAllArtworksForAdmin(),
    searchParams,
    getPreviewContext(null),
  ]);
  const saved = typeof params.saved === "string" ? params.saved : null;
  const deleted = params.deleted === "1";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl tracking-tight md:text-3xl">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <ListPreviewButton preview={preview} />
          <Link href="/admin/artworks/new" className="button-primary">
            {t("add")}
          </Link>
        </div>
      </div>
      <div role="status" className="mt-4">
        {saved && <p>{t("saved", { slug: saved })}</p>}
        {deleted && <p>{t("deleted")}</p>}
      </div>
      <p className="mt-2 text-sm text-muted">{t("orderHint")}</p>

      {artworks.length === 0 ? (
        <p className="mt-8 text-muted">{t("empty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-left">
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-normal">{t("columns.order")}</th>
                <th scope="col" className="py-2 pr-4 font-normal">{t("columns.cover")}</th>
                <th scope="col" className="py-2 pr-4 font-normal">{t("columns.title")}</th>
                <th scope="col" className="py-2 pr-4 font-normal">{t("columns.price")}</th>
                <th scope="col" className="py-2 pr-4 font-normal">{t("columns.status")}</th>
                <th scope="col" className="py-2 pr-4 font-normal">{t("columns.published")}</th>
                <th scope="col" className="py-2 font-normal">{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {artworks.map((artwork, index) => {
                const cover = artwork.images[0];
                return (
                  <tr key={artwork.id} className="align-middle">
                    <td className="py-3 pr-4">
                      <div className="flex gap-1">
                        <form action={moveArtworkAction}>
                          <input type="hidden" name="id" value={artwork.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            disabled={index === 0}
                            aria-label={t("moveUpLabel", { title: artwork.title })}
                            className="button-quiet min-h-9 px-2 py-1 text-sm"
                          >
                            {t("moveUp")}
                          </button>
                        </form>
                        <form action={moveArtworkAction}>
                          <input type="hidden" name="id" value={artwork.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            disabled={index === artworks.length - 1}
                            aria-label={t("moveDownLabel", { title: artwork.title })}
                            className="button-quiet min-h-9 px-2 py-1 text-sm"
                          >
                            {t("moveDown")}
                          </button>
                        </form>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="relative block size-14">
                        {cover ? (
                          <Image src={cover.src} alt={cover.alt} fill sizes="3.5rem" className="object-contain" />
                        ) : (
                          <span className="text-xs text-muted">{t("noCover")}</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <Link href={`/admin/artworks/${artwork.id}`} className="link">
                        {artwork.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      <span className="block">{t("mode", { mode: artwork.priceMode })}</span>
                      <span className="block text-muted">
                        {artwork.priceAmount === null
                          ? t("noPrice")
                          : formatPrice(artwork.priceAmount, artwork.currency, locale)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-sm">{t("status", { status: artwork.status })}</td>
                    <td className="py-3 pr-4 text-sm">
                      {t("published", { published: String(artwork.published) })}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <Link
                          href={`/admin/artworks/${artwork.id}`}
                          aria-label={t("editLabel", { title: artwork.title })}
                          className="link"
                        >
                          {t("edit")}
                        </Link>
                        <form action={setStatusAction}>
                          <input type="hidden" name="id" value={artwork.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={artwork.status === "SOLD" ? "AVAILABLE" : "SOLD"}
                          />
                          <button type="submit" className="link min-h-9">
                            {artwork.status === "SOLD" ? t("markAvailable") : t("markSold")}
                          </button>
                        </form>
                        <ConfirmDelete id={artwork.id} title={artwork.title} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
