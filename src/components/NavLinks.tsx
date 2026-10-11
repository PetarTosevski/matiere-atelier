"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const items = [
  { href: "/originals", key: "originals" },
  { href: "/commissions", key: "commissions" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

type Props = { orientation?: "horizontal" | "vertical" };

export function NavLinks({ orientation = "horizontal" }: Props) {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <ul
      className={
        orientation === "horizontal"
          ? "flex items-center gap-8"
          : "flex flex-col gap-5 text-menu-lg"
      }
    >
      {items.map(({ href, key }) => {
        const isPage = pathname === href;
        const isSection = pathname.startsWith(`${href}/`);
        return (
          <li key={key}>
            <Link
              href={href}
              aria-current={isPage ? "page" : isSection ? "true" : undefined}
              className="underline-offset-8 hover:underline aria-[current]:underline"
            >
              {t(key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
