import { getTranslations } from "next-intl/server";
import { CartLink } from "@/components/CartLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileMenu } from "@/components/MobileMenu";
import { NavLinks } from "@/components/NavLinks";
import { Wordmark } from "@/components/Wordmark";
import { isCartEnabled } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/settings";

export async function Header() {
  const [t, settings] = await Promise.all([
    getTranslations("Header"),
    getSiteSettings(),
  ]);
  const showCart = isCartEnabled(settings);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-band text-menu">
      <div className="site-container flex items-center justify-between gap-6 py-4 lg:py-6">
        <Wordmark />

        <nav aria-label={t("mainNavLabel")} className="hidden lg:block">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-5">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          {/* TODO(cart session): live item count from the cart provider. */}
          {showCart && <CartLink count={0} />}
          <MobileMenu openLabel={t("openMenu")} closeLabel={t("closeMenu")}>
            <nav aria-label={t("mainNavLabel")}>
              <NavLinks orientation="vertical" />
            </nav>
            <LanguageSwitcher />
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
