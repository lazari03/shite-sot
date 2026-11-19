import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/ui/shell";
import { Countdown } from "@/ui/countdown";
import { EmptyState } from "@/ui/section";
import { requireUserPage } from "@/server/authz";
import { sellerDashboard } from "@/features/dashboard/queries";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = { title: "Paneli", robots: { index: false } };

const FILTERS = ["all", "ACTIVE", "PENDING_REVIEW", "DRAFT", "SOLD", "EXPIRED"] as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const user = await requireUserPage("/paneli");
  const { f } = await searchParams;
  const filter = (FILTERS as readonly string[]).includes(f ?? "") ? (f as (typeof FILTERS)[number]) : "all";
  const now = new Date();
  const [t, { rows, metrics }] = await Promise.all([getTranslations(), sellerDashboard(user.id, now)]);
  const visible = rows.filter((r) => filter === "all" || r.status === filter || (filter === "DRAFT" && r.status === "REJECTED"));
  const stats: Array<[string, number]> = [
    [t("dashboard.metrics.active"), metrics.active],
    [t("dashboard.metrics.pending"), metrics.pending],
    [t("dashboard.metrics.sold"), metrics.sold],
    [t("dashboard.metrics.expired"), metrics.expired],
    [t("dashboard.metrics.views"), metrics.views],
    [t("dashboard.metrics.contactClicks"), metrics.contactClicks],
    [t("dashboard.metrics.favorites"), metrics.favorites],
  ];

  return (
    <Shell title={t("dashboard.title")} tabbar>
      <div className="wrap pt-4 pb-12 md:pt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="h-display text-[30px] md:text-[42px]">{t("dashboard.title")}</h1>
            <p className="text-muted">{t("dashboard.hello", { name: user.name })}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/llogaria" className="btn btn-line">
              {t("nav.settings")}
            </Link>
            <Link href="/shit" className="btn btn-lime">
              <Plus className="size-5" aria-hidden />
              {t("nav.sell")}
            </Link>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
          {stats.map(([label, n]) => (
            <div key={label} className="rounded-[var(--radius-md)] border border-line bg-white p-4">
              <dt className="text-xs font-semibold text-muted">{label}</dt>
              <dd className="price mt-1 text-[28px]">{n}</dd>
            </div>
          ))}
        </dl>
        <p className="hint mt-2">{t("dashboard.statsNote")}</p>

        <nav aria-label={t("dashboard.filter")} className="scroll-x mt-6">
          {FILTERS.map((k) => (
            <Link key={k} href={k === "all" ? "/paneli" : `/paneli?f=${k}`} className="chip" aria-current={filter === k ? "page" : undefined}>
              {k === "all" ? t("home.all") : t(`status.${k}`)}
            </Link>
          ))}
        </nav>

        <div className="mt-4 grid gap-2.5">
          {visible.length === 0 && (
            <EmptyState
              title={rows.length ? t("dashboard.emptyFilter") : t("dashboard.emptyTitle")}
              body={rows.length ? undefined : t("dashboard.emptyBody")}
              action={
                <Link className="btn btn-ink" href="/shit">
                  {t("nav.sell")}
                </Link>
              }
            />
          )}
          {visible.map((r) => (
            <Link key={r.id} href={`/paneli/njoftimet/${r.id}`} className="grid grid-cols-[64px_1fr] items-center gap-3 rounded-[var(--radius-md)] border border-line bg-white p-2.5 hover:border-line-strong md:grid-cols-[72px_1fr_auto_auto] md:gap-4">
              {r.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- thumbnail
                <img src={r.imageUrl} alt="" className="size-16 rounded-[var(--radius-sm)] object-cover md:size-[72px]" />
              ) : (
                <span className="size-16 rounded-[var(--radius-sm)] bg-placeholder md:size-[72px]" />
              )}
              <span className="min-w-0">
                <b className="block truncate">{r.title}</b>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <span className={`status status-${r.status}`}>{t(`status.${r.status}`)}</span>
                  <span className="price text-base">{formatPrice(r.priceMinor, r.currency)}</span>
                  {r.status === "ACTIVE" && r.expiresAt && <Countdown variant="inline" expiresAt={r.expiresAt} serverNow={now.getTime()} className="text-sm" />}
                  {r.promotedUntil && <span className="status">{t("listing.sponsored")}</span>}
                </span>
              </span>
              <span className="col-span-2 flex gap-4 text-xs text-muted md:col-span-1">
                <span>
                  {t("dashboard.views")}: <b className="text-ink">{r.views}</b>
                </span>
                <span>
                  {t("dashboard.contactClicks")}: <b className="text-ink">{r.contactClicks}</b>
                </span>
                <span>
                  {t("dashboard.favorites")}: <b className="text-ink">{r.favorites}</b>
                </span>
              </span>
              <span className="text-sm font-bold max-md:hidden">{t("dashboard.open")} →</span>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}
