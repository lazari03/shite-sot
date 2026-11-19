import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/server/authz";
import { recentAudit } from "@/features/admin/queries";
import { formatDateTime } from "@/lib/time";

export default async function AuditPage() {
  await requireAdminPage();
  const [t, rows] = await Promise.all([getTranslations("admin"), recentAudit()]);
  return (
    <div className="panel overflow-x-auto p-0 md:p-0">
      <table className="table">
        <thead>
          <tr>
            <th>{t("when")}</th>
            <th>{t("actor")}</th>
            <th>{t("action")}</th>
            <th>{t("entity")}</th>
            <th>{t("change")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
              <td className="text-sm">{r.actor?.name ?? t("system")}</td>
              <td className="font-mono text-xs">{r.action}</td>
              <td className="font-mono text-xs">
                {r.entity}:{r.entityId.slice(0, 10)}
              </td>
              <td className="max-w-[360px] truncate font-mono text-xs text-muted">{r.after ? JSON.stringify(r.after) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
