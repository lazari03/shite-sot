import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/server/authz";
import { systemHealth } from "@/features/admin/queries";
import { formatDateTime } from "@/lib/time";

export default async function HealthPage() {
  await requireAdminPage();
  const [t, h] = await Promise.all([getTranslations("admin"), systemHealth()]);
  return (
    <div className="grid gap-4">
      <section className="panel">
        <h2 className="h-display mb-2 text-xl">{t("database")}</h2>
        <p>
          <span className={h.dbOk ? "status status-ACTIVE" : "status status-REMOVED"}>{h.dbOk ? "OK" : "DOWN"}</span> <span className="text-sm text-muted">{h.dbLatencyMs} ms</span>
        </p>
      </section>
      <section className="panel">
        <h2 className="h-display mb-2 text-xl">{t("worker")}</h2>
        {h.heartbeats.length === 0 ? (
          <p className="error">{t("workerNeverRan")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("job")}</th>
                <th>{t("lastRun")}</th>
                <th>{t("detail")}</th>
              </tr>
            </thead>
            <tbody>
              {h.heartbeats.map((b) => {
                const stale = b.stale;
                return (
                  <tr key={b.name}>
                    <td className="font-mono text-xs">{b.name}</td>
                    <td className={stale ? "error" : "text-sm"}>
                      {formatDateTime(b.at)}
                      {stale && ` · ${t("stale")}`}
                    </td>
                    <td className="font-mono text-xs text-muted">{JSON.stringify(b.detail)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <p className="hint">{t("errorsHint")}</p>
    </div>
  );
}
