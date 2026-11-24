import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDiscoveryOptions } from "@/features/catalog/discovery-options";
import { Shell } from "@/ui/shell";
import { getCurrentUser } from "@/server/authz";
import { getCategoryBySlug, getCities } from "@/features/catalog/queries";
import { discoverListings, promotedListings, favoriteIdsFor } from "@/features/listings/queries";
import { DiscoveryFilters } from "@/features/listings/schema";
import { Filters } from "@/features/listings/components/filters";
import { Results } from "@/features/listings/components/results";
import { ListingCard, CardGrid } from "@/ui/listing-card";
import { track } from "@/features/analytics/service";

type Params = Promise<{ slug: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SP }): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return {};
  const t = await getTranslations("category");
  const filtered = Object.keys(sp).length > 0;
  return {
    title: t("metaTitle", { name: cat.name }),
    description: t("metaDescription", { name: cat.name }),
    alternates: { canonical: `/kategori/${cat.slug}` },
    // Only the unfiltered category page is indexable.
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title: t("metaTitle", { name: cat.name }), description: t("metaDescription", { name: cat.name }), url: `/kategori/${cat.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  const filters = DiscoveryFilters.parse({ ...Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])), category: cat.slug, q: undefined });
  const now = new Date();
  const [t, user, cities, result, options] = await Promise.all([getTranslations(), getCurrentUser(), getCities(), discoverListings(filters, now), getDiscoveryOptions()]);
  const spotlight = filters.page === 1 ? await promotedListings("CATEGORY_SPOTLIGHT", { limit: 4, categoryIds: [cat.id, ...cat.children.map((c) => c.id)] }, now) : [];
  const saved = await favoriteIdsFor(user?.id, spotlight.map((s) => s.id));
  await track("CATEGORY_VIEW", { categoryId: cat.id, userId: user?.id, dedupe: true });
  const subcats = cat.parent ? [] : cat.children;

  return (
    <Shell title={cat.name} tabbar>
      <div className="wrap pt-4 pb-10 md:pt-7">
        {cat.parent && (
          <Link href={`/kategori/${cat.parent.slug}`} className="mb-2 inline-block text-sm font-semibold text-muted hover:text-ink">
            ← {cat.parent.name}
          </Link>
        )}
        <h1 className="h-display text-[28px] md:text-[42px]">{cat.name}</h1>
        {subcats.length > 0 && (
          <nav aria-label={t("category.subcategories")} className="scroll-x -mx-4 mt-3 px-4 md:mx-0 md:px-0">
            <Link className="chip" href={`/kategori/${cat.slug}`} aria-current="page">
              {t("home.all")}
            </Link>
            {subcats.map((c) => (
              <Link key={c.id} className="chip" href={`/kategori/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </nav>
        )}
        {spotlight.length > 0 && (
          <section aria-label={t("listing.sponsored")} className="mt-4">
            <CardGrid>
              {spotlight.map((l) => (
                <ListingCard key={l.id} item={l} serverNow={now.getTime()} saved={saved.has(l.id)} loggedIn={Boolean(user)} />
              ))}
            </CardGrid>
          </section>
        )}
        <Filters action={`/kategori/${cat.slug}`} filters={filters} cities={cities} options={options} />
        <Results result={result} filters={filters} basePath={`/kategori/${cat.slug}`} userId={user?.id} serverNow={now.getTime()} />
      </div>
    </Shell>
  );
}
