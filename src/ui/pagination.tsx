import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function Pagination({ page, pageCount, makeHref }: { page: number; pageCount: number; makeHref: (p: number) => string }) {
  if (pageCount <= 1) return null;
  const t = await getTranslations("pagination");
  return (
    <nav aria-label={t("label")} className="mt-8 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link className="btn btn-line" href={makeHref(page - 1)} rel="prev">
          {t("prev")}
        </Link>
      ) : (
        <span className="btn btn-line opacity-40" aria-hidden>
          {t("prev")}
        </span>
      )}
      <span className="px-3 text-sm font-semibold text-muted">{t("of", { page, pageCount })}</span>
      {page < pageCount ? (
        <Link className="btn btn-line" href={makeHref(page + 1)} rel="next">
          {t("next")}
        </Link>
      ) : (
        <span className="btn btn-line opacity-40" aria-hidden>
          {t("next")}
        </span>
      )}
    </nav>
  );
}
