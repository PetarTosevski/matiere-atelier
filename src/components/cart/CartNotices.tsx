"use client";

import { useTranslations } from "next-intl";
import { useCart } from "./CartProvider";

/** Tells the visitor which pieces were taken out of their cart, and why. */
export function CartNotices() {
  const t = useTranslations("CartNotices");
  const { notices, dismissNotices } = useCart();

  return (
    <div role="status" className="site-container">
      {notices.length > 0 && (
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border border-line bg-paper px-4 py-3">
          <ul className="space-y-1">
            {notices.map((notice) => (
              <li key={notice.id}>
                {notice.title === null
                  ? t("unavailable")
                  : t("removed", { title: notice.title, reason: notice.reason })}
              </li>
            ))}
          </ul>
          <button type="button" onClick={dismissNotices} className="link min-h-11">
            {t("dismiss")}
          </button>
        </div>
      )}
    </div>
  );
}
