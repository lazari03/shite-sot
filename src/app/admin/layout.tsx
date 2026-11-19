import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/ui/shell";
import { requireAdminPage } from "@/server/authz";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const LINKS = [
  ["/admin", "overview"],
  ["/admin/moderimi", "moderation"],
  ["/admin/raportet", "reports"],
  ["/admin/perdoruesit", "users"],
  ["/admin/kategorite", "categories"],
  ["/admin/promovimet", "promotions"],
  ["/admin/auditimi", "audit"],
  ["/admin/shendeti", "health"],
] as const;

/** Guard here AND in every admin action (layouts don't protect server actions). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  const t = await getTranslations("admin");
  return (
    <Shell title={t("title")}>
      <div className="wrap pt-4 pb-16 md:pt-7">
        <h1 className="h-display text-[28px] md:text-[38px]">{t("title")}</h1>
        <nav aria-label={t("title")} className="scroll-x mt-3">
          {LINKS.map(([href, key]) => (
            <Link key={href} href={href} className="chip">
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>
        <div className="mt-6">{children}</div>
      </div>
    </Shell>
  );
}
