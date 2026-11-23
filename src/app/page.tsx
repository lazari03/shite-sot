import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/ui/shell";
import { ListingCard, CardGrid } from "@/ui/listing-card";
import { HeroClock } from "@/ui/hero-clock";
import { SectionHead, EmptyState } from "@/ui/section";
import { getCurrentUser } from "@/server/authz";
import { getCategoryTree, getCities } from "@/features/catalog/queries";
import { activeCountsByCategory, endingSoonListings, favoriteIdsFor, firstToEnd, promotedListings, recentListings } from "@/features/listings/queries";
import { formatPrice } from "@/lib/money";

export default async function HomePage() {
  const now = new Date();
  const serverNow = now.getTime();
  const [t, user, categories, cities, counts, first, ending, recent, spotlight, featured] = await Promise.all([
    getTranslations(),
    getCurrentUser(),
    getCategoryTree(),
    getCities(),
    activeCountsByCategory(now),
    firstToEnd(now),
    endingSoonListings(8, now),
    recentListings(8, now),
    promotedListings("HOMEPAGE_SPOTLIGHT", { limit: 4 }, now),
    promotedListings("FEATURED", { limit: 4 }, now),
  ]);
  const totalActive = [...counts.values()].reduce((a, b) => a + b, 0);
  const promoted = [...spotlight, ...featured.filter((f) => !spotlight.some((s) => s.id === f.id))].slice(0, 4);
  const allIds = [...promoted, ...ending, ...recent].map((l) => l.id);
  const saved = await favoriteIdsFor(user?.id, allIds);
  const loggedIn = Boolean(user);
  const card = (l: (typeof ending)[number], i: number) => <ListingCard key={l.id} item={l} serverNow={serverNow} saved={saved.has(l.id)} loggedIn={loggedIn} priority={i < 2} />;

  return (
    <Shell variant="home" tabbar>
      <div className="wrap">
        <section aria-labelledby="hero-title" className="mt-3 grid items-center gap-3 rounded-[var(--radius-lg)] bg-ink p-4 text-white md:mt-5 md:p-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:gap-8 xl:p-9">
          <div>
            <h1 id="hero-title" className="font-display text-[34px] leading-[.92] font-extrabold tracking-[-0.05em] md:mb-3 md:text-[clamp(44px,5.25vw,74px)]">
              {t("home.heroTitle")}
            </h1>
            <p className="mb-4 max-w-[40ch] text-[17px] text-[#bfcbc0] max-md:hidden">{t("home.heroBody")}</p>
            <div className="flex flex-wrap gap-2.5 max-md:hidden">
              <a className="btn btn-lime btn-lg" href="#ending">
                {t("home.ctaBrowse")}
              </a>
              <Link className="btn btn-lg border border-[#4a5e51] text-white hover:border-[#8fa294] hover:bg-white/5" href="/shit">
                {t("nav.sell")}
              </Link>
            </div>
          </div>
          {first?.expiresAt ? (
            <HeroClock
              serverNow={serverNow}
              item={{
                slug: first.slug,
                title: first.title,
                city: first.city,
                expiresAt: first.expiresAt,
                imageUrl: first.imageUrl,
                price: formatPrice(first.priceMinor, first.currency),
                condition: t(`condition.${first.condition}`),
              }}
            />
          ) : (
            <div className="rounded-[var(--radius-md)] bg-ink-2 p-4 md:p-5">
              <p className="font-display text-2xl font-bold tracking-tight text-lime">{t("home.noActiveTitle")}</p>
              <p className="mt-2 text-[#bfcbc0]">{t("home.noActiveBody")}</p>
              <Link href="/shit" className="btn btn-lime mt-3">
                <Plus className="size-5" aria-hidden />
                {t("home.beFirst")}
              </Link>
            </div>
          )}
        </section>

        <nav aria-label={t("nav.categories")} className="scroll-x -mx-4 mt-2 bg-paper px-4 py-2 md:-mx-8 md:px-8">
          <Link className="chip" href="/kerko">
            {t("home.all")}
            <small>{totalActive}</small>
          </Link>
          {categories.map((c) => (
            <Link key={c.id} className="chip" href={`/kategori/${c.slug}`}>
              {c.name}
              <small>{counts.get(c.id) ?? 0}</small>
            </Link>
          ))}
        </nav>

        {promoted.length > 0 && (
          <section aria-labelledby="featured-title">
            <SectionHead id="featured" title={t("home.featuredTitle")} subtitle={t("home.featuredSubtitle")} />
            <CardGrid>{promoted.map(card)}</CardGrid>
          </section>
        )}

        <section aria-labelledby="ending-title">
          <SectionHead id="ending" title={t("home.endingTitle")} subtitle={t("home.activeCount", { count: totalActive })} href="/kerko?sort=ending" linkLabel={t("home.seeAll")} />
          <CardGrid>
            {ending.length ? ending.map(card) : <EmptyState title={t("home.emptyTitle")} body={t("home.emptyBody")} action={<Link className="btn btn-ink" href="/shit">{t("nav.sell")}</Link>} />}
          </CardGrid>
        </section>

        {recent.length > 0 && (
          <section aria-labelledby="recent-title">
            <SectionHead id="recent" title={t("home.recentTitle")} href="/kerko?sort=newest" linkLabel={t("home.seeAll")} />
            <CardGrid>{recent.map(card)}</CardGrid>
          </section>
        )}

        <section aria-labelledby="cities" className="mt-7">
          <h2 id="cities" className="h-display text-[22px] md:text-[28px]">
            {t("home.byCity")}
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cities.map((c) => (
              <Link key={c.id} href={`/kerko?city=${c.slug}`} className="chip">
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        <section id="si-funksionon" aria-labelledby="how-title" className="my-7 grid scroll-mt-4 items-center gap-5 rounded-[var(--radius-lg)] bg-sage p-4 md:my-10 md:p-7 lg:grid-cols-[.9fr_1.4fr] lg:gap-7">
          <div>
            <h2 id="how-title" className="mb-3 font-display text-[28px] leading-[1.02] font-bold tracking-[-0.035em] md:text-[clamp(28px,3.2vw,40px)]">
              {t("home.howTitle")}
            </h2>
            <p className="mb-6 max-w-[36ch] text-[#4d5a48]">{t("home.howBody")}</p>
            <Link className="btn btn-ink" href="/shit">
              <Plus className="size-5" aria-hidden />
              {t("nav.sell")}
            </Link>
          </div>
          <ol className="grid gap-2.5 md:grid-cols-3">
            {(["one", "two", "three"] as const).map((k, i) => (
              <li key={k} className="rounded-[var(--radius-md)] bg-white/65 p-3.5">
                <span className="mb-2 grid size-8 place-items-center rounded-full bg-ink font-display text-[15px] font-bold text-lime">{i + 1}</span>
                <b className="mb-1 block text-base">{t(`home.step.${k}.title`)}</b>
                <span className="text-sm text-[#4d5a48]">{t(`home.step.${k}.body`)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Shell>
  );
}
