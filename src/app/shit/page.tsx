import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/ui/shell";
import { requireUserPage } from "@/server/authz";
import { db } from "@/server/db";
import { getCategoryOptions, getCities } from "@/features/catalog/queries";
import { SellForm } from "@/features/listings/components/sell-form";

export const metadata: Metadata = { title: "Shit diçka", robots: { index: false } };

export default async function SellPage() {
  const user = await requireUserPage("/shit");
  const [t, categories, cities, profile] = await Promise.all([
    getTranslations("sell"),
    getCategoryOptions(),
    getCities(),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { contactConsent: true, whatsapp: true, city: true } }),
  ]);
  const defaultCity = cities.find((c) => c.name === profile.city)?.id ?? "";
  return (
    <Shell title={t("pageTitle")} actionbar>
      <div className="wrap pt-4 pb-10 md:pt-7 md:pb-[72px]">
        <h1 className="h-display mb-2 text-[30px] max-md:hidden md:text-[44px]">{t("pageTitle")}</h1>
        <p className="mb-5 text-muted">{t("lead")}</p>
        <SellForm
          categories={categories}
          cities={cities}
          needsContact={!profile.contactConsent || !profile.whatsapp}
          initial={{ title: "", description: "", categoryId: "", cityId: defaultCity, condition: "", currency: "EUR", price: "", referencePrice: "", referencePriceSource: "", locationNote: "", images: [] }}
        />
      </div>
    </Shell>
  );
}
