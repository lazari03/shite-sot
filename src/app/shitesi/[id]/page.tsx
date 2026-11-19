import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Shell } from "@/ui/shell";
import { ListingCard, CardGrid } from "@/ui/listing-card";
import { EmptyState } from "@/ui/section";
import { getCurrentUser } from "@/server/authz";
import { getSellerProfile } from "@/features/sellers/queries";
import { favoriteIdsFor } from "@/features/listings/queries";
import { isPro } from "@/features/promotions/rules";
import { formatDate } from "@/lib/time";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const p = await getSellerProfile(id);
  if (!p) return {};
  const t = await getTranslations("seller");
  return { title: t("metaTitle", { name: p.seller.name }), alternates: { canonical: `/shitesi/${id}` }, robots: p.active.length ? undefined : { index: false, follow: true } };
}

export default async function SellerPage({ params }: { params: Params }) {
  const { id } = await params;
  const now = new Date();
  const p = await getSellerProfile(id, now);
  if (!p) notFound();
  const [t, user, locale] = await Promise.all([getTranslations(), getCurrentUser(), getLocale()]);
  const saved = await favoriteIdsFor(user?.id, p.active.map((a) => a.id));
  const { seller } = p;
  return (
    <Shell title={seller.name} tabbar>
      <div className="wrap pt-4 pb-12 md:pt-7">
        <section className="panel flex flex-wrap items-center gap-4">
          {seller.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar
            <img src={seller.image} alt="" className="size-20 rounded-full object-cover" />
          ) : (
            <span className="grid size-20 place-items-center rounded-full bg-ink font-display text-3xl font-bold text-lime">{seller.name.slice(0, 1).toUpperCase()}</span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="h-display flex items-center gap-2 text-[28px] md:text-[36px]">
              {seller.name}
              {seller.verifiedAt && <BadgeCheck className="size-6 text-lime-deep" aria-label={t("seller.verified")} />}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {[seller.city, t("seller.memberSince", { date: formatDate(seller.createdAt, locale === "en" ? "en-GB" : "sq-AL") })].filter(Boolean).join(" · ")}
            </p>
            {seller.bio && <p className="mt-2 max-w-[60ch]">{seller.bio}</p>}
          </div>
          <dl className="flex gap-6">
            <div>
              <dt className="text-xs text-muted">{t("seller.active")}</dt>
              <dd className="price text-2xl">{p.active.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t("seller.sold")}</dt>
              <dd className="price text-2xl">{p.soldCount}</dd>
            </div>
          </dl>
          <div className="flex w-full flex-wrap gap-2">
            <span className="status">{seller.verifiedAt ? t("seller.verified") : t("seller.notVerified")}</span>
            {isPro(seller, now) && <span className="status status-SOLD">{t("seller.pro")}</span>}
          </div>
        </section>
        <h2 className="h-display mt-8 text-[24px] md:text-[30px]">{t("seller.activeDeals")}</h2>
        <CardGrid className="mt-3">
          {p.active.length ? p.active.map((l) => <ListingCard key={l.id} item={l} serverNow={now.getTime()} saved={saved.has(l.id)} loggedIn={Boolean(user)} />) : <EmptyState title={t("seller.noActive")} />}
        </CardGrid>
      </div>
    </Shell>
  );
}
