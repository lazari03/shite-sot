import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/server/authz";
import { searchUsers } from "@/features/admin/queries";
import { UserActions } from "@/features/admin/components/admin-actions";
import { formatDate } from "@/lib/time";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminPage();
  const { q } = await searchParams;
  const [t, users] = await Promise.all([getTranslations("admin"), searchUsers(q?.slice(0, 100))]);
  return (
    <div className="grid gap-4">
      <form className="flex gap-2" role="search">
        <label htmlFor="uq" className="sr-only">
          {t("searchUsers")}
        </label>
        <input id="uq" name="q" defaultValue={q} placeholder={t("searchUsers")} className="input h-11 max-w-md" />
        <button className="btn btn-ink">{t("search")}</button>
      </form>
      <div className="panel overflow-x-auto p-0 md:p-0">
        <table className="table">
          <thead>
            <tr>
              <th>{t("user")}</th>
              <th>{t("joined")}</th>
              <th>{t("listings")}</th>
              <th>{t("flags")}</th>
              <th>{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <b>{u.name}</b>
                  <div className="text-xs text-muted">{u.email}</div>
                </td>
                <td className="text-sm">{formatDate(u.createdAt)}</td>
                <td className="num">{u._count.listings}</td>
                <td className="flex flex-wrap gap-1">
                  {u.role === "ADMIN" && <span className="status status-SOLD">ADMIN</span>}
                  {u.bannedAt && <span className="status status-REMOVED">{t("banned")}</span>}
                  {u.verifiedAt && <span className="status status-ACTIVE">{t("verified")}</span>}
                  {u.trusted && <span className="status">{t("trusted")}</span>}
                  {!u.emailVerified && <span className="status status-PENDING_REVIEW">{t("emailUnverified")}</span>}
                </td>
                <td>
                  <UserActions id={u.id} banned={Boolean(u.bannedAt)} verified={Boolean(u.verifiedAt)} trusted={u.trusted} isAdmin={u.role === "ADMIN"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
