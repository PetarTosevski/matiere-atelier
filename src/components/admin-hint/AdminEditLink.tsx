"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { usePathname } from "@/i18n/navigation";
import { adminEditTarget } from "@/lib/admin-hint";
import { adminHintStore } from "./admin-hint-store";

/**
 * A small "Edit" link in the corner of the storefront, shown only in the
 * browser the artist uses for the admin. Pages stay static: visitors get
 * nothing, because the server snapshot is always "not the artist".
 */
export function AdminEditLink() {
  const t = useTranslations("AdminEditLink");
  const pathname = usePathname();
  const isAdmin = useSyncExternalStore(adminHintStore.subscribe, adminHintStore.getSnapshot, adminHintStore.getServerSnapshot);
  if (!isAdmin) return null;

  const target = adminEditTarget(pathname);
  return (
    // A plain <a>: /admin has its own root layout.
    <a
      href={target.href}
      className="label-caps fixed bottom-4 left-4 z-40 inline-flex min-h-11 items-center bg-accent px-4 text-on-accent hover:text-on-accent"
    >
      {t(target.kind)}
    </a>
  );
}
