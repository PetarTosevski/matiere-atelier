import { useTranslations } from "next-intl";

/** The Originals heading and statement. Shared by the page and the admin preview. */
export function OriginalsIntro() {
  const t = useTranslations("Originals");

  return (
    <section className="flex flex-col gap-5 pt-14 pb-12 md:gap-6 md:pt-20 md:pb-16 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:pt-22 lg:pb-18">
      <h1 className="font-serif text-display font-normal">
        {t.rich("title", {
          em: (chunks) => <em className="text-accent">{chunks}</em>,
        })}
      </h1>
      <p className="max-w-[32.5rem] leading-[1.65] text-muted md:text-[1.0625rem] lg:w-[22.5rem] lg:max-w-none lg:shrink-0">
        {t("intro")}
      </p>
    </section>
  );
}
