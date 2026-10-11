import { toLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = toLocale((await params).locale);
  redirect({ href: "/originals", locale });
}
