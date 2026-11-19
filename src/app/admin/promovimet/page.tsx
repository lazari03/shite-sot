import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/server/authz";
import { promotionAdminData } from "@/features/admin/queries";
import { GrantPromotionForm, ProductForm } from "@/features/admin/components/admin-actions";
import { paymentsEnabled } from "@/features/promotions/payments";
import { minorToInput } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export default async function PromotionsAdminPage() {
  await requireAdminPage();
  const [t, { products, active }] = await Promise.all([getTranslations("admin"), promotionAdminData()]);
  return (
    <div className="grid gap-4">
      <p className="rounded-[var(--radius-sm)] bg-[#fff3cf] p-3 text-sm text-[#7a5600]">{paymentsEnabled() ? t("paymentsOn") : t("paymentsOff")}</p>
      <section className="panel grid gap-4" aria-labelledby="prices">
        <h2 id="prices" className="h-display text-xl">
          {t("priceList")}
        </h2>
        {products.map((p) => (
          <ProductForm key={p.id} product={{ id: p.id, name: p.name, price: minorToInput(p.priceMinor, p.currency), durationHours: p.durationHours, active: p.active, placement: p.placement }} />
        ))}
      </section>
      <section className="panel" aria-labelledby="grant">
        <h2 id="grant" className="h-display mb-1 text-xl">
          {t("grantTitle")}
        </h2>
        <p className="hint mb-3">{t("grantHint")}</p>
        <GrantPromotionForm products={products.filter((p) => p.placement && p.active).map((p) => ({ code: p.code, name: p.name }))} />
      </section>
      <section className="panel" aria-labelledby="running">
        <h2 id="running" className="h-display mb-3 text-xl">
          {t("runningPromotions")}
        </h2>
        {active.length === 0 ? (
          <p className="text-muted">{t("noPromotions")}</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {active.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2">
                <Link className="font-semibold hover:underline" href={`/p/${p.listing.slug}`}>
                  {p.listing.title}
                </Link>
                <span className="text-muted">
                  {p.product.name} · {t("until")} {p.endsAt ? formatDateTime(p.endsAt) : "—"} · {p.grantedById ? t("adminGrant") : t("paid")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
