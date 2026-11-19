import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/server/authz";
import { openReports } from "@/features/admin/queries";
import { ReportActions } from "@/features/admin/components/admin-actions";
import { formatDateTime } from "@/lib/time";

export default async function ReportsPage() {
  await requireAdminPage();
  const [t, tr, ts, reports] = await Promise.all([getTranslations("admin"), getTranslations("report"), getTranslations("status"), openReports()]);
  if (!reports.length) return <p className="empty text-muted">{t("noReports")}</p>;
  return (
    <div className="grid gap-3">
      {reports.map((r) => (
        <article key={r.id} className="panel grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="status status-REJECTED">{tr(`reasons.${r.reason}`)}</span>
            <span className={`status status-${r.listing.status}`}>{ts(r.listing.status)}</span>
            <span className="text-xs text-muted">{formatDateTime(r.createdAt)}</span>
          </div>
          <Link href={`/p/${r.listing.slug}`} target="_blank" className="font-bold hover:underline">
            {r.listing.title}
          </Link>
          {r.details && <p className="text-sm whitespace-pre-line">{r.details}</p>}
          <p className="text-xs text-muted">
            {t("reporter")}: {r.reporter?.name ?? t("anonymous")}
          </p>
          <ReportActions id={r.id} />
        </article>
      ))}
    </div>
  );
}
