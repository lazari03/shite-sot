import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/server/authz";
import { moderationQueue } from "@/features/admin/queries";
import { ModerationActions } from "@/features/admin/components/admin-actions";
import { formatPrice } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export default async function ModerationPage() {
  await requireAdminPage();
  const [t, tc, queue] = await Promise.all([getTranslations("admin"), getTranslations("condition"), moderationQueue()]);
  if (!queue.length) return <p className="empty text-muted">{t("queueEmpty")}</p>;
  return (
    <div className="grid gap-4">
      {queue.map((l) => (
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
            <p className="price text-2xl">{formatPrice(l.priceMinor, l.currency)}</p>
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
            <ModerationActions id={l.id} />
          </div>
        </article>
      ))}
    </div>
  );
}
