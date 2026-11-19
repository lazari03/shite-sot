import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/server/authz";
import { allCategories } from "@/features/admin/queries";
import { CategoryForm } from "@/features/admin/components/admin-actions";

export default async function CategoriesPage() {
  await requireAdminPage();
  const [t, cats] = await Promise.all([getTranslations("admin"), allCategories()]);
  const parents = cats.filter((c) => !c.parentId);
  const ordered = parents.flatMap((p) => [p, ...cats.filter((c) => c.parentId === p.id)]);
  return (
    <div className="grid gap-4">
      <section className="panel" aria-labelledby="newcat">
        <h2 id="newcat" className="h-display mb-3 text-xl">
          {t("newCategory")}
        </h2>
        <CategoryForm parents={parents} />
      </section>
      <section className="panel grid gap-4" aria-labelledby="cats">
        <h2 id="cats" className="h-display text-xl">
          {t("nav.categories")}
        </h2>
        {ordered.map((c) => (
          <div key={c.id} className={c.parentId ? "border-l-2 border-line pl-4" : ""}>
            <p className="mb-1 text-xs text-muted">{t("listingsCount", { count: c._count.listings })}</p>
            <CategoryForm category={c} parents={parents} />
          </div>
        ))}
      </section>
    </div>
  );
}
