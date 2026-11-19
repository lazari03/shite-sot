import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/ui/shell";
import { getCurrentUser } from "@/server/authz";
import { getCategoryTree, getCities } from "@/features/catalog/queries";
import { discoverListings } from "@/features/listings/queries";
import { DiscoveryFilters } from "@/features/listings/schema";
import { Filters } from "@/features/listings/components/filters";
import { SearchBox } from "@/features/listings/components/search-box";
import { Results } from "@/features/listings/components/results";
import { track } from "@/features/analytics/service";
import { rateLimit } from "@/server/rate-limit";
import { requestFingerprint } from "@/features/analytics/service";
import Link from "next/link";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const t = await getTranslations("search");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  // Search result pages are not indexed (thin/duplicate content); category pages are.
  return { title: q ? t("titleQuery", { q }) : t("title"), robots: { index: false, follow: true }, alternates: { canonical: "/kerko" } };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters = DiscoveryFilters.parse(Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const now = new Date();
  const [t, user, cities, categories] = await Promise.all([getTranslations(), getCurrentUser(), getCities(), getCategoryTree()]);

  let limited = false;
  if (filters.q) {
    const fp = await requestFingerprint();
    try {
      await rateLimit("search", user?.id ?? fp.visitorHash);
    } catch {
      limited = true;
    }
  }
  const result = limited ? { items: [], total: 0, page: 1, pageCount: 0 } : await discoverListings(filters, now);
  if (filters.q && filters.page === 1 && !limited) {
    await track("SEARCH", { userId: user?.id, meta: { q: filters.q.slice(0, 100), results: result.total, city: filters.city ?? null } });
  }

  return (
    <Shell title={t("search.title")} tabbar>
      <div className="wrap pt-4 pb-10 md:pt-7">
        <h1 className="h-display mb-4 text-[28px] max-md:hidden md:text-[40px]">{filters.q ? t("search.titleQuery", { q: filters.q }) : t("search.title")}</h1>
        <Suspense>
          <SearchBox initial={filters.q ?? ""} />
        </Suspense>
        <nav aria-label={t("nav.categories")} className="scroll-x -mx-4 mt-3 px-4 md:mx-0 md:px-0">
          {categories.map((c) => (
            <Link key={c.id} className="chip" href={`/kategori/${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </nav>
        <Filters action="/kerko" filters={filters} cities={cities} keepQuery />
        {limited ? <p className="error mt-6">{t("errors.RATE_LIMITED")}</p> : <Results result={result} filters={filters} basePath="/kerko" userId={user?.id} serverNow={now.getTime()} />}
      </div>
    </Shell>
  );
}
