import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/ui/shell";
import { ListingCard, CardGrid } from "@/ui/listing-card";
import { EmptyState } from "@/ui/section";
import { getCurrentUser } from "@/server/authz";
import { userFavorites } from "@/features/dashboard/queries";
import { toCard } from "@/features/listings/queries";

export const metadata: Metadata = { title: "Të ruajtura", robots: { index: false } };

export default async function SavedPage() {
  const [t, user] = await Promise.all([getTranslations(), getCurrentUser()]);
  const now = new Date();
  const favs = user ? await userFavorites(user.id) : [];
  const cards = favs.map((f) => toCard(f.listing, now)).sort((a, b) => Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE"));
  const live = cards.filter((c) => c.status === "ACTIVE").length;

  return (
    <Shell title={t("saved.title")} tabbar>
      <div className="wrap pt-4 pb-12 md:pt-7">
        <h1 className="h-display text-[30px] md:text-[42px]">{t("saved.title")}</h1>
        {user && <p className="mt-1 text-muted">{t("saved.count", { count: live })}</p>}
        <CardGrid className="mt-4">
          {!user ? (
            <EmptyState
              title={t("saved.loginTitle")}
              body={t("saved.loginBody")}
              action={
                <Link className="btn btn-ink" href="/hyr?next=/ruajtura">
                  {t("nav.login")}
                </Link>
              }
            />
          ) : cards.length === 0 ? (
            <EmptyState
              title={t("saved.emptyTitle")}
              body={t("saved.emptyBody")}
              action={
                <Link className="btn btn-ink" href="/">
                  {t("saved.browse")}
                </Link>
              }
            />
          ) : (
            cards.map((c) => <ListingCard key={c.id} item={c} serverNow={now.getTime()} saved loggedIn />)
          )}
        </CardGrid>
      </div>
    </Shell>
  );
}
