import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Shell } from "@/ui/shell";
import { requireUserPage } from "@/server/authz";
import { db } from "@/server/db";
import { getCities } from "@/features/catalog/queries";
import { AvatarForm, DeleteAccountForm, LanguageSwitch, ProfileForm, SignOutButton } from "@/features/account/components/account-forms";
import { formatPhoneForInput } from "@/features/account/format";

export const metadata: Metadata = { title: "Llogaria", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUserPage("/llogaria");
  const [t, locale, cities, p] = await Promise.all([
    getTranslations("account"),
    getLocale(),
    getCities(),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, city: true, bio: true, whatsapp: true, contactConsent: true, image: true, email: true, verifiedAt: true } }),
  ]);
  return (
    <Shell title={t("title")} tabbar>
      <div className="wrap max-w-[760px] pt-4 pb-12 md:pt-7">
        <h1 className="h-display mb-5 text-[30px] md:text-[42px]">{t("title")}</h1>
        <section className="panel grid gap-5" aria-labelledby="profile">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="profile" className="h-display text-2xl">
              {t("profile")}
            </h2>
            <Link href={`/shitesi/${user.id}`} className="text-sm font-bold underline">
              {t("viewPublic")}
            </Link>
          </div>
          <AvatarForm image={p.image} name={p.name} />
          <p className="text-sm text-muted">
            {p.email} · {p.verifiedAt ? t("verified") : t("notVerified")}
          </p>
          <ProfileForm cities={cities.map((c) => c.name)} profile={{ name: p.name, city: p.city ?? "", bio: p.bio ?? "", whatsapp: formatPhoneForInput(p.whatsapp), contactConsent: p.contactConsent, image: p.image, email: p.email }} />
        </section>
        <section className="panel mt-4 grid gap-3" aria-labelledby="prefs">
          <h2 id="prefs" className="h-display text-2xl">
            {t("preferences")}
          </h2>
          <LanguageSwitch locale={locale} />
          <div>
            <SignOutButton />
          </div>
        </section>
        <section className="panel mt-4 grid gap-3 border-clay/40" aria-labelledby="danger">
          <h2 id="danger" className="h-display text-2xl text-clay">
            {t("deleteTitle")}
          </h2>
          <DeleteAccountForm email={p.email} />
        </section>
      </div>
    </Shell>
  );
}
