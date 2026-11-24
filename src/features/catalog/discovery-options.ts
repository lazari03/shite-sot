import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { postgres } from "@/server/postgres";

export type DiscoveryOption = { key: string; label: string };

export const getDiscoveryOptions = cache(async () => {
  const locale = await getLocale();
  const { rows } = await postgres().query<DiscoveryOption & { kind: "condition" | "sort" }>(`
    SELECT "kind", "key",
      CASE WHEN $1 = 'en' THEN "labelEn" ELSE "labelSq" END AS "label"
    FROM public."DiscoveryOption"
    ORDER BY "sortOrder", "key"`, [locale]);
  return {
    conditions: rows.filter((row) => row.kind === "condition"),
    sorts: rows.filter((row) => row.kind === "sort"),
  };
});
