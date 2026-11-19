import "server-only";
import { cache } from "react";
import { db } from "@/server/db";

export type CategoryNode = { id: string; slug: string; name: string; nameEn: string; children: Array<{ id: string; slug: string; name: string; nameEn: string }> };

/** Active top-level categories with their active children, in admin-defined order. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  return db.category.findMany({
    where: { active: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      nameEn: true,
      children: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, slug: true, name: true, nameEn: true } },
    },
  });
});

export const getCities = cache(async () => db.city.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, slug: true, name: true } }));

export const getCategoryBySlug = cache(async (slug: string) =>
  db.category.findFirst({
    where: { slug, active: true },
    include: { parent: true, children: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  }),
);

/** Flat list (parents + children) for selects, e.g. "Telefona" and "Telefona › iPhone". */
export async function getCategoryOptions() {
  const tree = await getCategoryTree();
  return tree.flatMap((c) => [{ id: c.id, label: c.name }, ...c.children.map((ch) => ({ id: ch.id, label: `${c.name} › ${ch.name}` }))]);
}
