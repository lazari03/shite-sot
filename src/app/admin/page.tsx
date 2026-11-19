import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/server/authz";
import { adminMetrics, dailyActivity } from "@/features/admin/queries";
import { formatPrice } from "@/lib/money";

const EVENT_COLS = ["LISTING_SUBMITTED", "LISTING_ACTIVATED", "LISTING_SOLD", "LISTING_EXPIRED", "LISTING_VIEW", "CONTACT_CLICK", "SEARCH", "FAVORITE_ADDED"] as const;

export default async function AdminOverview() {
  await requireAdminPage();
  const [t, m, activity] = await Promise.all([getTranslations("admin"), adminMetrics(), dailyActivity()]);
  const tiles: Array<[string, string | number]> = [
    [t("m.users"), m.users],
    [t("m.active"), m.active],
    [t("m.expired"), m.expired],
    [t("m.sold"), m.sold],
    [t("m.createdToday"), m.createdToday],
    [t("m.pending"), m.pending],
    [t("m.reports"), m.openReports],
    [t("m.contactClicks"), m.contactClicks],
    [t("m.revenue"), m.revenue.length ? m.revenue.map((r) => formatPrice(r.amountMinor, r.currency)).join(" + ") : t("m.noRevenue")],
  ];
  return (
    <div className="grid gap-6">
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-[var(--radius-md)] border border-line bg-white p-4">
            <dt className="text-xs font-semibold text-muted">{label}</dt>
            <dd className="price mt-1 text-[26px]">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="hint">{t("trafficNote")}</p>
      <section className="panel overflow-x-auto" aria-labelledby="activity">
        <h2 id="activity" className="h-display mb-3 text-xl">
          {t("activity")}
        </h2>
        {activity.length === 0 ? (
          <p className="text-muted">{t("noActivity")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("day")}</th>
                {EVENT_COLS.map((c) => (
                  <th key={c}>{t(`events.${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activity.map((row) => (
                <tr key={row.day}>
                  <td className="num font-semibold">{row.day}</td>
                  {EVENT_COLS.map((c) => (
                    <td key={c} className="num">
                      {row.counts[c] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
