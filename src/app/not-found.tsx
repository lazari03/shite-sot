import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/ui/shell";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <Shell title={t("title")} tabbar>
      <div className="wrap py-16 text-center">
        <h1 className="h-display text-[34px]">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("body")}</p>
        <Link href="/" className="btn btn-ink mt-6">
          {t("cta")}
        </Link>
      </div>
    </Shell>
  );
}
