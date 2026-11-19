"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { moderateListingAction, resolveReportAction, setUserFlagAction, saveCategoryAction, savePromotionProductAction, grantPromotionAction, type FormState } from "../actions";

function useRun() {
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; messageKey?: string; fieldErrors?: Record<string, string> }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(te(Object.values(r.fieldErrors ?? {})[0] ?? r.messageKey ?? "INTERNAL"));
      else router.refresh();
    });
  return { pending, error, run };
}

export function ModerationActions({ id }: { id: string }) {
  const t = useTranslations("admin");
  const { pending, error, run } = useRun();
  const [reason, setReason] = useState("");
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-lime btn-sm" disabled={pending} onClick={() => run(() => moderateListingAction(id, "approve"))}>
          {t("approve")}
        </button>
        <button className="btn btn-line btn-sm" disabled={pending || !reason.trim()} onClick={() => run(() => moderateListingAction(id, "reject", reason))}>
          {t("reject")}
        </button>
        <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => window.confirm(t("confirmRemove")) && run(() => moderateListingAction(id, "remove", reason || undefined))}>
          {t("remove")}
        </button>
      </div>
      <label className="sr-only" htmlFor={`reason-${id}`}>
        {t("reason")}
      </label>
      <input id={`reason-${id}`} className="input h-10 text-sm" placeholder={t("reasonPlaceholder")} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function ReportActions({ id }: { id: string }) {
  const t = useTranslations("admin");
  const { pending, error, run } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn btn-line btn-sm" disabled={pending} onClick={() => run(() => resolveReportAction(id, "dismiss"))}>
        {t("dismiss")}
      </button>
      <button className="btn btn-line btn-sm" disabled={pending} onClick={() => run(() => resolveReportAction(id, "resolve"))}>
        {t("resolve")}
      </button>
      <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => window.confirm(t("confirmRemove")) && run(() => resolveReportAction(id, "remove_listing"))}>
        {t("removeListing")}
      </button>
      {error && <p className="error w-full">{error}</p>}
    </div>
  );
}

export function UserActions({ id, banned, verified, trusted, isAdmin }: { id: string; banned: boolean; verified: boolean; trusted: boolean; isAdmin: boolean }) {
  const t = useTranslations("admin");
  const { pending, error, run } = useRun();
  return (
    <div className="flex flex-wrap gap-1.5">
      <button className="btn btn-line btn-sm" disabled={pending} onClick={() => run(() => setUserFlagAction(id, verified ? "unverify" : "verify"))}>
        {verified ? t("unverify") : t("verify")}
      </button>
      <button className="btn btn-line btn-sm" disabled={pending} onClick={() => run(() => setUserFlagAction(id, trusted ? "untrust" : "trust"))}>
        {trusted ? t("untrust") : t("trust")}
      </button>
      {!isAdmin && (
        <button
          className={banned ? "btn btn-line btn-sm" : "btn btn-danger btn-sm"}
          disabled={pending}
          onClick={() => {
            if (banned) return run(() => setUserFlagAction(id, "unban"));
            const reason = window.prompt(t("banReason"));
            if (reason !== null) run(() => setUserFlagAction(id, "ban", reason));
          }}
        >
          {banned ? t("unban") : t("ban")}
        </button>
      )}
      {error && <p className="error w-full">{error}</p>}
    </div>
  );
}

function FormFeedback({ state }: { state: FormState }) {
  const t = useTranslations("admin");
  const te = useTranslations("errors");
  if (!state) return null;
  if (state.ok) return <p className="text-sm font-semibold text-sage-ink">{t("saved")}</p>;
  const first = Object.values(state.fieldErrors ?? {})[0];
  return <p className="error">{te(first ?? state.messageKey)}</p>;
}

type Cat = { id: string; name: string; nameEn: string; slug: string; parentId: string | null; sortOrder: number; active: boolean };

export function CategoryForm({ category, parents }: { category?: Cat; parents: Array<{ id: string; name: string }> }) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState<FormState, FormData>(saveCategoryAction, null);
  const [v, setV] = useState({ name: category?.name ?? "", nameEn: category?.nameEn ?? "", slug: category?.slug ?? "", parentId: category?.parentId ?? "", sortOrder: String(category?.sortOrder ?? 0), active: category?.active ?? true });
  const bind = (k: "name" | "nameEn" | "slug" | "parentId" | "sortOrder") => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((p) => ({ ...p, [k]: e.target.value })) });
  return (
    <form action={action} className="grid items-end gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_80px_auto_auto]">
      {category && <input type="hidden" name="id" value={category.id} />}
      <label className="field">
        <span className="text-xs text-muted">{t("nameSq")}</span>
        <input name="name" required className="input h-10 text-sm" {...bind("name")} />
      </label>
      <label className="field">
        <span className="text-xs text-muted">{t("nameEn")}</span>
        <input name="nameEn" required className="input h-10 text-sm" {...bind("nameEn")} />
      </label>
      <label className="field">
        <span className="text-xs text-muted">{t("slug")}</span>
        <input name="slug" className="input h-10 text-sm" {...bind("slug")} />
      </label>
      <label className="field">
        <span className="text-xs text-muted">{t("parent")}</span>
        <select name="parentId" className="input h-10 text-sm" {...bind("parentId")}>
          <option value="">—</option>
          {parents.filter((p) => p.id !== category?.id).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="text-xs text-muted">{t("order")}</span>
        <input name="sortOrder" type="number" min={0} className="input h-10 text-sm" {...bind("sortOrder")} />
      </label>
      <label className="check items-center pb-2.5">
        <input type="checkbox" name="active" checked={v.active} onChange={(e) => setV((p) => ({ ...p, active: e.target.checked }))} />
        {t("active")}
      </label>
      <button className="btn btn-ink btn-sm h-10" disabled={pending}>
        {category ? t("save") : t("add")}
      </button>
      <div className="md:col-span-7">
        <FormFeedback state={state} />
      </div>
    </form>
  );
}

export function ProductForm({ product }: { product: { id: string; name: string; price: string; durationHours: number | null; active: boolean; placement: string | null } }) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState<FormState, FormData>(savePromotionProductAction, null);
  const [v, setV] = useState({ price: product.price, durationHours: product.durationHours ? String(product.durationHours) : "", active: product.active });
  return (
    <form action={action} className="grid items-end gap-2 md:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
      <input type="hidden" name="id" value={product.id} />
      <p className="font-semibold">{product.name}</p>
      <label className="field">
        <span className="text-xs text-muted">{t("priceEur")}</span>
        <input name="price" required inputMode="decimal" className="input h-10 text-sm" value={v.price} onChange={(e) => setV((p) => ({ ...p, price: e.target.value }))} />
      </label>
      {product.placement ? (
        <label className="field">
          <span className="text-xs text-muted">{t("durationHours")}</span>
          <input name="durationHours" type="number" min={1} max={48} placeholder={t("untilExpiry")} className="input h-10 text-sm" value={v.durationHours} onChange={(e) => setV((p) => ({ ...p, durationHours: e.target.value }))} />
        </label>
      ) : (
        <span className="text-xs text-muted">{t("subscription")}</span>
      )}
      <label className="check items-center pb-2.5">
        <input type="checkbox" name="active" checked={v.active} onChange={(e) => setV((p) => ({ ...p, active: e.target.checked }))} />
        {t("active")}
      </label>
      <button className="btn btn-ink btn-sm h-10" disabled={pending}>
        {t("save")}
      </button>
      <div className="md:col-span-5">
        <FormFeedback state={state} />
      </div>
    </form>
  );
}

export function GrantPromotionForm({ products }: { products: Array<{ code: string; name: string }> }) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState<FormState, FormData>(grantPromotionAction, null);
  const [v, setV] = useState({ listing: "", product: products[0]?.code ?? "", note: "" });
  return (
    <form action={action} className="grid items-end gap-2 md:grid-cols-[2fr_1fr_1.5fr_auto]">
      <label className="field">
        <span className="text-xs text-muted">{t("listingRef")}</span>
        <input name="listing" required className="input h-10 text-sm" value={v.listing} onChange={(e) => setV((p) => ({ ...p, listing: e.target.value }))} />
      </label>
      <label className="field">
        <span className="text-xs text-muted">{t("product")}</span>
        <select name="product" className="input h-10 text-sm" value={v.product} onChange={(e) => setV((p) => ({ ...p, product: e.target.value }))}>
          {products.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="text-xs text-muted">{t("note")}</span>
        <input name="note" maxLength={300} className="input h-10 text-sm" value={v.note} onChange={(e) => setV((p) => ({ ...p, note: e.target.value }))} />
      </label>
      <button className="btn btn-lime btn-sm h-10" disabled={pending}>
        {t("grant")}
      </button>
      <div className="md:col-span-4">
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
