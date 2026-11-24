"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import type { DiscoveryOption } from "@/features/catalog/discovery-options";
import type { DiscoveryFiltersValue } from "../schema";

type Props = {
  action: string;
  filters: DiscoveryFiltersValue;
  options: { conditions: DiscoveryOption[]; sorts: DiscoveryOption[] };
  cities: Array<{ slug: string; name: string }>;
  /** Keep the query when filtering on /kerko. */
  keepQuery?: boolean;
};

/** Plain GET form (works without JS); selects auto-submit when JS is available. */
export function Filters({ action, filters, cities, options, keepQuery }: Props) {
  const t = useTranslations("filters");
  const ref = useRef<HTMLFormElement>(null);
  const submit = () => ref.current?.requestSubmit();
  const sel = "input h-10 text-sm font-semibold md:h-11";

  return (
    <form ref={ref} action={action} method="get" className="mt-3 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-end" aria-label={t("label")}>
      {keepQuery && filters.q && <input type="hidden" name="q" value={filters.q} />}
      <label className="field md:w-44">
        <span className="text-xs font-semibold text-muted">{t("city")}</span>
        <select name="city" defaultValue={filters.city ?? ""} className={sel} onChange={submit}>
          <option value="">{t("allCities")}</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field md:w-44">
        <span className="text-xs font-semibold text-muted">{t("condition")}</span>
        <select name="condition" defaultValue={filters.condition ?? ""} className={sel} onChange={submit}>
          <option value="">{t("anyCondition")}</option>
          {options.conditions.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field md:w-28">
        <span className="text-xs font-semibold text-muted">{t("min")}</span>
        <input name="min" type="number" inputMode="numeric" min={0} defaultValue={filters.min ?? ""} placeholder="0" className={sel} />
      </label>
      <label className="field md:w-28">
        <span className="text-xs font-semibold text-muted">{t("max")}</span>
        <input name="max" type="number" inputMode="numeric" min={0} defaultValue={filters.max ?? ""} placeholder="∞" className={sel} />
      </label>
      <label className="field md:w-52">
        <span className="text-xs font-semibold text-muted">{t("sort")}</span>
        <select name="sort" defaultValue={filters.sort} className={sel} onChange={submit}>
          {options.sorts.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn-ink h-10 md:h-11">
        <SlidersHorizontal className="size-4" aria-hidden />
        {t("apply")}
      </button>
    </form>
  );
}
