import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ListingCard, CardGrid } from "@/ui/listing-card";
import { EmptyState } from "@/ui/section";
import { Pagination } from "@/ui/pagination";
import { MoreResults } from "./more-results";
import { favoriteIdsFor, type DiscoveryResult } from "../queries";
import type { DiscoveryFiltersValue } from "../schema";

export function filtersToQuery(f: DiscoveryFiltersValue, overrides: Partial<Record<keyof DiscoveryFiltersValue, string | number | undefined>> = {}) {
  const p = new URLSearchParams();
  const merged = { ...f, ...overrides };
  for (const k of ["q", "city", "condition", "min", "max", "sort", "page"] as const) {
    const v = merged[k];
    if (v === undefined || v === "" || (k === "sort" && v === "ending") || (k === "page" && Number(v) === 1)) continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function Results({ result, filters, basePath, userId, serverNow }: { result: DiscoveryResult; filters: DiscoveryFiltersValue; basePath: string; userId?: string; serverNow: number }) {
  const t = await getTranslations();
  const saved = await favoriteIdsFor(userId, result.items.map((i) => i.id));
  const hasFilters = Boolean(filters.q || filters.city || filters.condition || filters.min !== undefined || filters.max !== undefined);
  return (
    <>
      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {t("search.count", { count: result.total })}
      </p>
      <CardGrid>
        {result.items.length ? (
          result.items.map((l, i) => <ListingCard key={l.id} item={l} serverNow={serverNow} saved={saved.has(l.id)} loggedIn={Boolean(userId)} priority={i < 2} />)
        ) : (
          <EmptyState
            title={filters.q ? t("search.emptyQuery", { q: filters.q }) : t("search.empty")}
            body={t("search.emptyBody")}
            action={
              hasFilters ? (
                <Link className="btn btn-ink" href={basePath}>
                  {t("filters.clear")}
                </Link>
              ) : undefined
            }
          />
        )}
        {result.page < result.pageCount && result.page < 500 && (
          <MoreResults
            key={`${basePath}${filtersToQuery(filters)}`}
            filters={filters}
            firstIds={result.items.map((item) => item.id)}
            lastPage={result.pageCount}
            nextHref={`${basePath}${filtersToQuery(filters, { page: result.page + 1 })}`}
          />
        )}
      </CardGrid>
      {result.page > 1 && <Pagination page={result.page} pageCount={result.pageCount} makeHref={(p) => `${basePath}${filtersToQuery(filters, { page: p })}`} />}
    </>
  );
}
