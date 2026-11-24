import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/server/authz";
import { moderationQueue } from "@/features/admin/queries";
import { ModerationActions } from "@/features/admin/components/admin-actions";
import { Pagination } from "@/ui/pagination";
import { formatPrice } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

type SearchParams = Promise<{ view?: string; page?: string }>;

export default async function ModerationPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const params = await searchParams;
  const view = params.view === "all" ? "all" : "pending";
  const pageNumber = Number(params.page);
  const requestedPage = Number.isSafeInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const [t, tc, ts, { listings, page, pageCount }] = await Promise.all([
    getTranslations("admin"),
    getTranslations("condition"),
    getTranslations("status"),
    moderationQueue(view, requestedPage),
  ]);
  const href = (nextView: typeof view, nextPage = 1) => `/admin/moderimi?view=${nextView}&page=${nextPage}`;
  return (
    <div className="grid gap-4">
      <nav aria-label={t("listingViews")} className="flex flex-wrap gap-2">
        <Link className="chip min-h-11" href={href("pending")} aria-current={view === "pending" ? "page" : undefined}>{t("pendingListings")}</Link>
        <Link className="chip min-h-11" href={href("all")} aria-current={view === "all" ? "page" : undefined}>{t("allListings")}</Link>
      </nav>
      {listings.length === 0 && <p className="empty text-muted">{t(view === "pending" ? "queueEmpty" : "allListingsEmpty")}</p>}
      {listings.map((l) => (
        <article key={l.id} className="panel grid gap-4 lg:grid-cols-[320px_1fr]" aria-labelledby={`l-${l.id}`}>
          <div className="grid grid-cols-3 gap-1.5">
            {l.imageUrls.map((src) => (
              <a key={src} href={src} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- moderation preview */}
                <img src={src} alt="" className="aspect-square w-full rounded-[var(--radius-sm)] object-cover" />
              </a>
            ))}
          </div>
          <div className="grid content-start gap-2">
            <h2 id={`l-${l.id}`} className="h-display text-xl">
              <Link className="hover:underline" href={`/p/${l.slug}`} target="_blank">
                {l.title}
              </Link>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <p className="price text-2xl">{formatPrice(l.priceMinor, l.currency)}</p>
              <span className={`status status-${l.status}`}>{ts(l.status)}</span>
            </div>
            <p className="text-sm text-muted">
              {l.category.name} · {l.city.name} · {tc(l.condition)} · {t("submitted")} {l.submittedAt ? formatDateTime(l.submittedAt) : "—"}
              {l.publishedAt && ` · ${t("reReview")}`}
            </p>
            {l.referencePriceMinor && (
              <p className="text-sm">
                {t("referencePrice")}: {formatPrice(l.referencePriceMinor, l.currency)} ({l.referencePriceSource})
              </p>
            )}
            <p className="text-sm whitespace-pre-line">{l.description}</p>
            <p className="text-xs text-muted">
              {t("seller")}: {l.seller.name} ({l.seller.email}) · {t("listingsCount", { count: l.seller._count.listings })} · {t("joined")} {formatDateTime(l.seller.createdAt)}
            </p>
            {l.status === "PENDING_REVIEW" && <ModerationActions id={l.id} />}
          </div>
        </article>
      ))}
      <Pagination page={page} pageCount={pageCount} makeHref={(nextPage) => href(view, nextPage)} />
    </div>
  );
}
