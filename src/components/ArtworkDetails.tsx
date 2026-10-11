import { useTranslations } from "next-intl";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Markdown } from "@/components/Markdown";
import { AvailabilityLabel, FormattedPrice } from "@/components/PriceInfo";
import { Link } from "@/i18n/navigation";
import type { PriceView } from "@/lib/pricing";

type Props = {
  id: string;
  slug: string;
  title: string;
  description: string;
  view: PriceView;
};

/** Title, price, availability, primary action and description. */
export function ArtworkDetails({ id, slug, title, description, view }: Props) {
  return (
    <div className="lg:sticky lg:top-[calc(var(--spacing-header)+2rem)] lg:self-start">
      <h1 className="heading-display">{title}</h1>
      <div className="mt-6 space-y-1 border-t border-line pt-5">
        {view.price && (
          <p className="text-xl font-semibold">
            <FormattedPrice price={view.price} />
          </p>
        )}
        <p className="text-muted">
          <AvailabilityLabel availability={view.availability} />
        </p>
      </div>
      <div className="mt-8">
        <PrimaryAction id={id} slug={slug} view={view} />
      </div>
      <Markdown className="prose-description mt-10 max-w-prose text-muted [&_strong]:text-ink">
        {description}
      </Markdown>
    </div>
  );
}

function PrimaryAction({
  id,
  slug,
  view,
}: Pick<Props, "id" | "slug" | "view">) {
  const t = useTranslations("Artwork");

  switch (view.action) {
    case "ADD_TO_CART":
      return <AddToCartButton artworkId={id} />;
    case "REQUEST":
      return (
        <Link
          href={`/request/${slug}`}
          className="button-primary w-full sm:w-auto"
        >
          {t("requestPiece")}
        </Link>
      );
    case "ASK":
      return (
        <Link
          href={`/request/${slug}`}
          className="button-primary w-full sm:w-auto"
        >
          {t("askAboutPiece")}
        </Link>
      );
  }
}
