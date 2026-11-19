import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Eye, MessageCircle, Heart } from "lucide-react";
import { Shell } from "@/ui/shell";
import { Countdown } from "@/ui/countdown";
import { Price } from "@/ui/price";
import { requireUserPage } from "@/server/authz";
import { db } from "@/server/db";
import { env } from "@/env";
import { getListingForOwner } from "@/features/listings/queries";
import { canUnmarkSold, effectiveStatus, isDeletable, isEditable } from "@/features/listings/rules";
import { needsModeration } from "@/features/auth/policy";
import { imageUrl } from "@/features/media/service";
import { Gallery } from "@/features/listings/components/gallery";
import { OwnerActions } from "@/features/listings/components/owner-actions";
import { paymentsEnabled } from "@/features/promotions/payments";
import { formatPrice } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Njoftimi im", robots: { index: false } };

export default async function ManageListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rishikim?: string }> }) {
  const { id } = await params;
  const { rishikim } = await searchParams;
  const user = await requireUserPage(`/paneli/njoftimet/${id}`);
  const l = await getListingForOwner(id);
  if (!l || l.sellerId !== user.id) notFound();
  const now = new Date();
  const status = effectiveStatus(l, now);
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const dateLocale = locale === "en" ? "en-GB" : "sq-AL";
  const images = l.images.map((i) => ({ src: imageUrl(i.key, 640), srcLarge: imageUrl(i.key, 1280), width: i.width, height: i.height }));

  let willReview = false;
  if (status === "DRAFT" || status === "REJECTED") {
    const approvedCount = await db.listing.count({ where: { sellerId: user.id, publishedAt: { not: null } } });
    willReview = needsModeration({ mode: env().MODERATION_MODE, trusted: user.trusted, approvedCount, trustAfter: env().MODERATION_TRUST_AFTER });
  }
  const products = status === "ACTIVE" ? await db.promotionProduct.findMany({ where: { active: true, placement: { not: null } }, orderBy: { priceMinor: "asc" } }) : [];
  const contact = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { contactConsent: true, whatsapp: true } });

  return (
    <Shell title={t("dashboard.manageTitle")}>
      <div className="wrap pt-4 pb-16 md:pt-7">
        <Link href="/paneli" className="mb-3 inline-block text-sm font-semibold text-muted hover:text-ink max-md:hidden">
          ← {t("dashboard.title")}
        </Link>
        {rishikim && (
          <p role="status" className="mb-4 rounded-[var(--radius-sm)] bg-[#fff3cf] p-3 text-sm font-semibold text-[#7a5600]">
            {t("dashboard.editSentToReview")}
          </p>
        )}
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1fr] lg:gap-10">
          <Gallery images={images} title={l.title} />
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`status status-${status}`}>{t(`status.${status}`)}</span>
              {l.publishedAt && <span className="text-sm text-muted">{t("dashboard.publishedAt", { date: formatDateTime(l.publishedAt, dateLocale) })}</span>}
            </div>
            <h1 className="h-display text-[28px] md:text-[36px]">{l.title}</h1>
            <Price minor={l.priceMinor} currency={l.currency} className="text-[36px]" />
            {status === "REJECTED" && l.rejectionReason && (
              <p className="rounded-[var(--radius-sm)] bg-clay-soft p-3 text-sm text-[#9c2f12]">
                <b>{t("dashboard.rejectedReason")}</b> {l.rejectionReason}
              </p>
            )}
            {status === "ACTIVE" && l.expiresAt && (
              <div className="rounded-[var(--radius-md)] border border-line bg-white p-4">
                <Countdown expiresAt={l.expiresAt.toISOString()} serverNow={now.getTime()} variant="detail" refreshOnExpire />
              </div>
            )}
            {(status === "DRAFT" || status === "REJECTED") && (
              <p className="rounded-[var(--radius-sm)] bg-sage p-3 text-sm text-sage-ink">{willReview ? t("dashboard.publishReviewHint") : t("dashboard.publishLiveHint")}</p>
            )}
            {status === "PENDING_REVIEW" && <p className="rounded-[var(--radius-sm)] bg-[#fff3cf] p-3 text-sm text-[#7a5600]">{l.publishedAt ? t("dashboard.pendingClockRuns") : t("dashboard.pendingHint")}</p>}
            {status === "EXPIRED" && <p className="rounded-[var(--radius-sm)] bg-paper-2 p-3 text-sm text-muted">{t("dashboard.expiredHint")}</p>}
            {(!contact.contactConsent || !contact.whatsapp) && status !== "SOLD" && status !== "EXPIRED" && (
              <p className="rounded-[var(--radius-sm)] border border-clay p-3 text-sm">
                {t("dashboard.noContactWarning")}{" "}
                <Link href="/llogaria" className="font-bold underline">
                  {t("dashboard.setupContact")}
                </Link>
              </p>
            )}
            <OwnerActions id={l.id} slug={l.slug} status={status} canUnmark={canUnmarkSold(l, now)} deletable={isDeletable(l)} editable={isEditable(status)} />
            {l.publishedAt && (
              <dl className="grid grid-cols-3 gap-3 border-y border-line py-4 text-center">
                <div>
                  <dt className="flex items-center justify-center gap-1 text-xs text-muted">
                    <Eye className="size-3.5" aria-hidden />
                    {t("dashboard.views")}
                  </dt>
                  <dd className="price text-2xl">{l.viewCount}</dd>
                </div>
                <div>
                  <dt className="flex items-center justify-center gap-1 text-xs text-muted">
                    <MessageCircle className="size-3.5" aria-hidden />
                    {t("dashboard.contactClicks")}
                  </dt>
                  <dd className="price text-2xl">{l.contactClickCount}</dd>
                </div>
                <div>
                  <dt className="flex items-center justify-center gap-1 text-xs text-muted">
                    <Heart className="size-3.5" aria-hidden />
                    {t("dashboard.favorites")}
                  </dt>
                  <dd className="price text-2xl">{l.favoriteCount}</dd>
                </div>
              </dl>
            )}
            {l.publishedAt && <p className="hint">{t("dashboard.statsNote")}</p>}
            <div>
              <h2 className="label mb-1">{t("listing.description")}</h2>
              <p className="whitespace-pre-line text-[#3f4a42]">{l.description}</p>
            </div>
            {products.length > 0 && (
              <section className="rounded-[var(--radius-md)] border border-line bg-white p-4" aria-labelledby="promo">
                <h2 id="promo" className="label">
                  {t("promotions.title")}
                </h2>
                <p className="hint mt-1">{t("promotions.noExtension")}</p>
                <ul className="mt-3 grid gap-1.5 text-sm">
                  {products.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3">
                      <span>{p.name}</span>
                      <b className="num">{formatPrice(p.priceMinor, p.currency)}</b>
                    </li>
                  ))}
                </ul>
                {!paymentsEnabled() && <p className="hint mt-3">{t("promotions.paymentsSoon")}</p>}
              </section>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
