"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ListingCard } from "@/ui/listing-card";
import { ListingSkeletons } from "@/ui/skeleton";
import { loadMoreListings } from "../load-more";
import type { DiscoveryFiltersValue } from "../schema";

type Batch = Awaited<ReturnType<typeof loadMoreListings>>;

export function MoreResults({ filters, firstIds, lastPage, nextHref }: {
  filters: DiscoveryFiltersValue;
  firstIds: string[];
  lastPage: number;
  nextHref: string;
}) {
  const t = useTranslations("search");
  const sentinel = useRef<HTMLDivElement>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const last = batches.at(-1);
  const page = last?.page ?? filters.page;
  const hasMore = page < Math.min(last?.pageCount ?? lastPage, 500);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore || failed || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      setLoading(true);
      void loadMoreListings({ ...filters, page: page + 1 })
        .then((batch) => {
          if (batch.page <= page) setFailed(true);
          else setBatches((previous) => [...previous, batch]);
        })
        .catch(() => setFailed(true))
        .finally(() => setLoading(false));
    }, { rootMargin: "0px 0px 300px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [failed, filters, hasMore, page]);

  const shown = new Set(firstIds);
  return (
    <>
      {batches.flatMap((batch) => batch.items.filter((item) => {
        if (shown.has(item.id)) return false;
        shown.add(item.id);
        return true;
      }).map((item) => (
        <ListingCard key={item.id} item={item} loggedIn={batch.loggedIn} saved={batch.saved.includes(item.id)} serverNow={batch.serverNow} />
      )))}
      {loading && <ListingSkeletons />}
      {hasMore && (
        <div ref={sentinel} aria-busy={loading} className="col-span-full flex flex-col items-center gap-2 py-3">
          {failed && <p role="status" className="text-sm text-muted">{t("moreFailed")}</p>}
          <a className="btn btn-line" href={nextHref.replace(/([?&])page=\d+$/, `$1page=${page + 1}`)}>{t("moreListings")}</a>
        </div>
      )}
    </>
  );
}
