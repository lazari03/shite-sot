import "server-only";
import { cache } from "react";
import { postgres } from "@/server/postgres";

type Category = { id: string; slug: string; name: string; nameEn: string };
export type CategoryNode = Category & { children: Category[] };

/** Active top-level categories with their active children, in admin-defined order. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const { rows } = await postgres().query<Category & { parentId: string | null }>(`
    SELECT "id", "slug", "name", "nameEn", "parentId"
    FROM public."Category" WHERE "active"
    ORDER BY "sortOrder", "name"`);
  const children = new Map<string, Category[]>();
  const roots: Category[] = [];
  for (const { parentId, ...category } of rows) {
    if (parentId === null) roots.push(category);
    else {
      const siblings = children.get(parentId) ?? [];
      siblings.push(category);
      children.set(parentId, siblings);
    }
  }
  return roots.map((category) => ({ ...category, children: children.get(category.id) ?? [] }));
});

export const getCities = cache(async () => {
  const { rows } = await postgres().query<{ id: string; slug: string; name: string }>(`
    SELECT "id", "slug", "name" FROM public."City" WHERE "active"
    ORDER BY "sortOrder", "name"`);
  return rows;
});

export const getCategoryBySlug = cache(async (slug: string) => {
  const { rows: [category] } = await postgres().query<Category & { parentId: string | null; parent: Pick<Category, "slug" | "name"> | null }>(`
    SELECT c."id", c."slug", c."name", c."nameEn", c."parentId",
      CASE WHEN p."id" IS NOT NULL THEN jsonb_build_object('slug', p."slug", 'name', p."name") END AS "parent"
    FROM public."Category" c
    LEFT JOIN public."Category" p ON p."id" = c."parentId"
    WHERE c."active" AND c."slug" = $1`, [slug]);
  if (!category) return null;
  const { rows: children } = await postgres().query<Category>(`
    SELECT "id", "slug", "name", "nameEn" FROM public."Category"
    WHERE "active" AND "parentId" = $1 ORDER BY "sortOrder", "name"`, [category.id]);
  return { ...category, children };
});

/** Flat list (parents + children) for selects, e.g. "Telefona" and "Telefona › iPhone". */
export async function getCategoryOptions() {
  const tree = await getCategoryTree();
  return tree.flatMap((c) => [{ id: c.id, label: c.name }, ...c.children.map((ch) => ({ id: ch.id, label: `${c.name} › ${ch.name}` }))]);
}
