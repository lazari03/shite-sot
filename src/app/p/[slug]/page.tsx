import { siteUrl } from "@/env";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BadgeCheck, Info } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { Shell } from "@/ui/shell";
import { Countdown } from "@/ui/countdown";
import { Price } from "@/ui/price";
import { SaveButton } from "@/ui/save-button";
import { ShareButton } from "@/ui/share-button";
import { ListingCard } from "@/ui/listing-card";
import { getCurrentUser } from "@/server/authz";
import { getListingBySlug, isFavorited, relatedListings, favoriteIdsFor } from "@/features/listings/queries";
import { effectiveStatus, canContactSeller } from "@/features/listings/rules";
import { canManageListing } from "@/features/auth/policy";
import { imageUrl } from "@/features/media/service";
import { trackListingView } from "@/features/analytics/service";
import { Gallery } from "@/features/listings/components/gallery";
import { ContactButton } from "@/features/listings/components/contact-button";
import { ReportDialog } from "@/features/reports/components/report-dialog";
import { formatPrice } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/time";

type Params = Promise<{ slug: string }>;
const PUBLIC = new Set(["ACTIVE", "SOLD", "EXPIRED"]);
/** Sold/expired pages stay reachable (with similar items) for 30 days, then 404. */
const HISTORY_DAYS = 30;

const load = cache(async (slug: string) => getListingBySlug(slug));

function isGone(l: { soldAt: Date | null; expiresAt: Date | null }, status: string, now: Date) {
  const end = status === "SOLD" ? l.soldAt : status === "EXPIRED" ? l.expiresAt : null;
  return Boolean(end && now.getTime() - end.getTime() > HISTORY_DAYS * 86_400_000);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const l = await load(slug);
  const now = new Date();
  if (!l) return {};
  const status = effectiveStatus(l, now);
  if (!PUBLIC.has(status) || l.seller.deletedAt || l.seller.bannedAt) return { robots: { index: false, follow: false } };
  const price = formatPrice(l.priceMinor, l.currency);
  const description = `${price} · ${l.city.name} · ${l.description.slice(0, 140)}`;
  const og = l.images[0] ? imageUrl(l.images[0].key, 1280) : undefined;
  return {
    title: `${l.title} — ${price}`,
    description,
    alternates: { canonical: `/p/${l.slug}` },
    // Only live deals are indexed; sold/expired stay reachable for humans but drop out of search engines.
    robots: status === "ACTIVE" ? undefined : { index: false, follow: true },
    openGraph: { type: "website", title: `${l.title} — ${price}`, description, url: `/p/${l.slug}`, images: og ? [{ url: og, width: l.images[0]!.width, height: l.images[0]!.height }] : undefined },
    other: { "product:price:amount": String(l.priceMinor / (l.currency === "EUR" ? 100 : 1)), "product:price:currency": l.currency, "og:availability": status === "ACTIVE" ? "instock" : "oos" },
  };
}

export default async function ListingPage({ params }: { params: Params }) {
  const { slug } = await params;
  const l = await load(slug);
  if (!l) notFound();
  const now = new Date();
  const serverNow = now.getTime();
  const [t, user, locale] = await Promise.all([getTranslations(), getCurrentUser(), getLocale()]);
  const status = effectiveStatus(l, now);
  const manager = canManageListing(user, l);
  const isOwner = user?.id === l.sellerId;
  const sellerGone = Boolean(l.seller.deletedAt || l.seller.bannedAt);

  if (!manager && (!PUBLIC.has(status) || sellerGone || isGone(l, status, now))) notFound();
  if (PUBLIC.has(status) && !isOwner) await trackListingView(l.id, l.categoryId, user?.id ?? null);

  const [saved, related] = await Promise.all([isFavorited(user?.id, l.id), relatedListings(l, 4, now)]);
  const relatedSaved = await favoriteIdsFor(user?.id, related.map((r) => r.id));
  const contactable = canContactSeller(l, l.seller, now);
  const url = `${siteUrl()}/p/${l.slug}`;
  const images = l.images.map((i) => ({ src: imageUrl(i.key, 640), srcLarge: imageUrl(i.key, 1280), width: i.width, height: i.height }));
  const category = l.category.parent ? `${l.category.parent.name} › ${l.category.name}` : l.category.name;

  const jsonLd =
    status === "ACTIVE" || status === "SOLD"
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: l.title,
          description: l.description.slice(0, 500),
          image: images.map((i) => i.srcLarge.startsWith("http") ? i.srcLarge : `${siteUrl()}${i.srcLarge}`),
          category,
          itemCondition: l.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: l.currency,
            price: (l.priceMinor / (l.currency === "EUR" ? 100 : 1)).toFixed(l.currency === "EUR" ? 2 : 0),
            availability: status === "ACTIVE" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
            priceValidUntil: l.expiresAt?.toISOString().slice(0, 10),
            areaServed: l.city.name,
          },
        }
      : null;

  return (
    <Shell title={l.title} actionbar>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <div className="wrap pb-8 md:pt-7 md:pb-[72px]">
        {manager && status !== "ACTIVE" && (
          <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-line bg-white p-4 max-md:mt-4">
            <Info className="size-5 text-muted" aria-hidden />
            <span className={`status status-${status}`}>{t(`status.${status}`)}</span>
            <span className="text-sm text-muted">{t("listing.ownerNotice")}</span>
            {isOwner && (
              <Link className="btn btn-line btn-sm ml-auto" href={`/paneli/njoftimet/${l.id}`}>
                {t("listing.manage")}
              </Link>
            )}
          </div>
        )}
        <div className="grid items-start gap-0 lg:grid-cols-[1.15fr_.85fr] lg:gap-11">
          <div className="lg:sticky lg:top-[calc(var(--hdr)+24px)]">
            <Gallery
              images={images}
              title={l.title}
              badge={status === "SOLD" ? <span className="tag tag-ink left-4 top-4 text-sm">{t("status.SOLD")}</span> : status === "EXPIRED" ? <span className="tag tag-ink left-4 top-4 text-sm">{t("status.EXPIRED")}</span> : undefined}
            />
          </div>
          <div className="flex flex-col gap-4 pt-5 lg:gap-[18px] lg:pt-0">
            <h1 className="font-display text-[26px] leading-[1.05] font-bold tracking-[-0.035em] md:text-[clamp(28px,3vw,40px)]">{l.title}</h1>
            <div className="flex flex-wrap items-baseline gap-3">
              <Price minor={l.priceMinor} currency={l.currency} className="text-[38px] tracking-[-0.04em] md:text-[46px]" />
              <span className="rounded-[5px] bg-sage px-2 py-1 text-[13px] font-bold text-sage-ink">{t("listing.fixedPrice")}</span>
            </div>
            {l.referencePriceMinor && (
              <p className="text-sm text-muted">
                {t("listing.referencePrice", { price: formatPrice(l.referencePriceMinor, l.currency) })}
                {l.referencePriceSource && <> · {t("listing.referenceSource", { source: l.referencePriceSource })}</>}
              </p>
            )}
            <div className="rounded-[var(--radius-md)] border border-line bg-white p-4">
              {status === "ACTIVE" && l.expiresAt ? (
                <Countdown expiresAt={l.expiresAt.toISOString()} serverNow={serverNow} variant="detail" refreshOnExpire />
              ) : (
                <p className="font-semibold text-muted">
                  {status === "SOLD" ? t("listing.soldNotice") : status === "EXPIRED" ? t("listing.expiredNotice") : t(`status.${status}`)}
                </p>
              )}
            </div>
            <p className="leading-[1.65] whitespace-pre-line text-[#3f4a42]">{l.description}</p>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5 border-y border-line py-[18px]">
              <div>
                <dt className="text-[13px] text-muted">{t("listing.city")}</dt>
                <dd className="font-semibold">
                  {l.city.name}
                  {l.locationNote ? `, ${l.locationNote}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">{t("listing.condition")}</dt>
                <dd className="font-semibold">{t(`condition.${l.condition}`)}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">{t("listing.category")}</dt>
                <dd className="font-semibold">
                  <Link className="hover:underline" href={`/kategori/${l.category.slug}`}>
                    {category}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">{t("listing.published")}</dt>
                <dd className="font-semibold">{l.publishedAt ? formatDateTime(l.publishedAt, locale === "en" ? "en-GB" : "sq-AL") : "—"}</dd>
              </div>
            </dl>

            <Link href={`/shitesi/${l.seller.id}`} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-white p-3.5 hover:border-line-strong">
              {l.seller.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar
                <img src={l.seller.image} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <span className="grid size-12 place-items-center rounded-full bg-ink font-display text-lg font-bold text-lime">{l.seller.name.slice(0, 1).toUpperCase()}</span>
              )}
              <span className="min-w-0">
                <b className="flex items-center gap-1.5">
                  {l.seller.name}
                  {l.seller.verifiedAt && <BadgeCheck className="size-4 text-lime-deep" aria-label={t("seller.verified")} />}
                </b>
                <small className="text-muted">{t("seller.memberSince", { date: formatDate(l.seller.createdAt, locale === "en" ? "en-GB" : "sq-AL") })}</small>
              </span>
            </Link>

            <div className="actionbar">
              <div className="mr-auto flex flex-col leading-[1.1] md:hidden">
                <strong className="price text-[22px] whitespace-nowrap">{formatPrice(l.priceMinor, l.currency)}</strong>
                <small className="text-xs text-muted">{t("listing.fixedPrice")}</small>
              </div>
              {contactable && l.expiresAt ? (
                <ContactButton listingId={l.id} expiresAt={l.expiresAt.toISOString()} serverNow={serverNow} />
              ) : status === "ACTIVE" && !isOwner ? (
                <p className="flex-1 text-sm font-semibold text-muted">{t("listing.noContact")}</p>
              ) : null}
              {PUBLIC.has(status) && <SaveButton listingId={l.id} initialSaved={saved} loggedIn={Boolean(user)} title={l.title} variant="square" />}
              <ShareButton title={l.title} url={url} />
            </div>
            <p className="text-xs leading-normal text-muted">{t("listing.safety")}</p>
            {!isOwner && PUBLIC.has(status) && <ReportDialog listingId={l.id} />}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-10 md:mt-[72px]" aria-labelledby="related">
            <h2 id="related" className="h-display mb-4 text-[22px] md:text-[28px]">
              {t("listing.related")}
            </h2>
            <div className="-mx-4 grid snap-x snap-mandatory auto-cols-[46%] grid-flow-col gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid-flow-row md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-4 [&>*]:snap-start">
              {related.map((r) => (
                <ListingCard key={r.id} item={r} serverNow={serverNow} saved={relatedSaved.has(r.id)} loggedIn={Boolean(user)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}
