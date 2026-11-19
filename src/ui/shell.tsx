import Link from "next/link";
import { Heart, Plus, Search, LayoutDashboard, LogIn } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/authz";
import { getCategoryTree } from "@/features/catalog/queries";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { Drawer } from "./drawer";
import { TabBar } from "./tabbar";
import { BackButton } from "./back-button";

type Props = {
  children: React.ReactNode;
  /** "home" shows logo + search on mobile; "page" shows back button + title on mobile. */
  variant?: "home" | "page";
  title?: string;
  /** Mobile bottom tab bar (top-level pages). */
  tabbar?: boolean;
  /** Page renders its own fixed bottom action bar on mobile. */
  actionbar?: boolean;
  headerExtra?: React.ReactNode;
  searchDefault?: string;
};

export async function Shell({ children, variant = "page", title, tabbar = false, actionbar = false, headerExtra, searchDefault }: Props) {
  const [t, user, categories] = await Promise.all([getTranslations(), getCurrentUser(), getCategoryTree()]);
  const isHome = variant === "home";

  return (
    <div className={cn(tabbar && "max-md:pb-[calc(var(--tabbar)+var(--safe-b))]", actionbar && "max-md:pb-[calc(76px+var(--safe-b))]")}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-white">
        {t("nav.skip")}
      </a>
      <header
        className={cn(
          "glass sticky top-0 z-30 border-b border-line pt-[env(safe-area-inset-top)] backdrop-blur-[14px] backdrop-saturate-[1.4]",
          isHome ? "bg-paper/90" : "bg-paper/90 max-md:bg-white/95",
        )}
      >
        <div className="wrap">
          <div className="-mx-1.5 flex min-h-14 flex-wrap items-center gap-1 md:mx-0 md:h-[72px] md:flex-nowrap md:gap-3">
            <Drawer
              categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
              user={user ? { name: user.name, isAdmin: user.role === "ADMIN" } : null}
              className={cn(!isHome && "max-md:hidden")}
            />
            {!isHome && <BackButton label={t("nav.back")} className="md:hidden" />}
            <Logo label={t("nav.homeLabel")} className={cn("h-14 md:h-auto", !isHome && "max-md:hidden")} />
            {!isHome && title && <span className="flex h-14 min-w-0 flex-1 items-center truncate font-display text-lg font-bold tracking-tight md:hidden">{title}</span>}
            {headerExtra}
            <form
              action="/kerko"
              role="search"
              className={cn("relative order-3 mx-1.5 mb-2.5 basis-full md:order-none md:mx-0 md:mb-0 md:ml-auto md:max-w-[560px] md:flex-1 md:basis-auto", !isHome && "max-md:hidden")}
            >
              <label htmlFor="site-search" className="sr-only">
                {t("search.label")}
              </label>
              <Search className="pointer-events-none absolute top-3 left-4 size-5 text-muted md:top-[13px] md:left-[17px]" aria-hidden />
              <input
                id="site-search"
                name="q"
                type="search"
                defaultValue={searchDefault}
                placeholder={t("search.placeholder")}
                autoComplete="off"
                enterKeyHint="search"
                maxLength={100}
                className="h-11 w-full appearance-none rounded-full border border-line bg-white pr-4 pl-[46px] text-base outline-none transition-colors focus:border-ink md:h-[46px] md:text-[15px]"
              />
            </form>
            <nav aria-label={t("nav.account")} className="ml-3 flex items-center gap-1.5 max-md:hidden">
              <Link className="btn btn-ghost" href="/ruajtura">
                <Heart className="size-5" aria-hidden />
                {t("nav.saved")}
              </Link>
              {user ? (
                <Link className="btn btn-ghost" href="/paneli">
                  <LayoutDashboard className="size-5" aria-hidden />
                  {t("nav.dashboard")}
                </Link>
              ) : (
                <Link className="btn btn-ghost" href="/hyr">
                  <LogIn className="size-5" aria-hidden />
                  {t("nav.login")}
                </Link>
              )}
              <Link className="btn btn-lime" href="/shit">
                <Plus className="size-5" aria-hidden />
                {t("nav.sell")}
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      {isHome && (
        <footer className="mt-10 border-t border-line py-6 text-[13px] text-muted md:pb-10">
          <div className="wrap flex flex-wrap justify-between gap-4">
            <span>© {new Date().getFullYear()} ShitShpejt</span>
            <span>{t("footer.tagline")}</span>
          </div>
        </footer>
      )}
      {tabbar && <TabBar loggedIn={Boolean(user)} />}
    </div>
  );
}
