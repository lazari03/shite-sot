import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/ui/shell";
import { requireUserPage } from "@/server/authz";
import { db } from "@/server/db";
import { getCategoryOptions, getCities } from "@/features/catalog/queries";
import { getListingForOwner } from "@/features/listings/queries";
import { isEditable } from "@/features/listings/rules";
import { imageUrl } from "@/features/media/service";
import { SellForm } from "@/features/listings/components/sell-form";
import { minorToInput } from "@/lib/money";

export const metadata: Metadata = { title: "Ndrysho njoftimin", robots: { index: false } };

export default async function EditListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ruajtur?: string }> }) {
  const { id } = await params;
  const { ruajtur } = await searchParams;
  const user = await requireUserPage(`/paneli/njoftimet/${id}/ndrysho`);
  const l = await getListingForOwner(id);
  if (!l || l.sellerId !== user.id) notFound();
  if (!isEditable(l.status)) redirect(`/paneli/njoftimet/${id}`);
  const [t, categories, cities, profile] = await Promise.all([
    getTranslations("sell"),
    getCategoryOptions(),
    getCities(),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { contactConsent: true, whatsapp: true } }),
  ]);
  return (
    <Shell title={t("editTitle")} actionbar>
      <div className="wrap pt-4 pb-10 md:pt-7 md:pb-[72px]">
        <h1 className="h-display mb-4 text-[30px] max-md:hidden md:text-[44px]">{t("editTitle")}</h1>
        {ruajtur && (
          <p role="status" className="mb-4 rounded-[var(--radius-sm)] bg-sage p-3 text-sm font-semibold text-sage-ink">
            {t("draftSaved")}
          </p>
        )}
        <SellForm
          categories={categories}
          cities={cities}
          needsContact={!profile.contactConsent || !profile.whatsapp}
          initial={{
            id: l.id,
            status: l.status,
            title: l.title,
            description: l.description,
            categoryId: l.categoryId,
            cityId: l.cityId,
            condition: l.condition,
            currency: l.currency,
            price: minorToInput(l.priceMinor, l.currency),
            referencePrice: l.referencePriceMinor ? minorToInput(l.referencePriceMinor, l.currency) : "",
            referencePriceSource: l.referencePriceSource ?? "",
            locationNote: l.locationNote ?? "",
            images: l.images.map((i) => ({ id: i.id, url: imageUrl(i.key, 640) })),
          }}
        />
      </div>
    </Shell>
  );
}
