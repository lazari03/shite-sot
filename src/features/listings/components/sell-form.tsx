"use client";

import { useActionState, useState } from "react";
import { MapPin, Camera, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { parsePriceToMinor, formatPrice } from "@/lib/money";
import { saveListingAction, type SaveListingState } from "../actions";
import { CONDITIONS } from "../schema";
import { ImageUploader, type UploadedImage } from "./image-uploader";

export type SellFormInitial = {
  id?: string;
  title: string;
  description: string;
  categoryId: string;
  cityId: string;
  condition: string;
  currency: "EUR" | "ALL";
  price: string;
  referencePrice: string;
  referencePriceSource: string;
  locationNote: string;
  images: UploadedImage[];
  status?: string;
};

type Props = {
  initial: SellFormInitial;
  categories: Array<{ id: string; label: string }>;
  cities: Array<{ id: string; name: string }>;
  needsContact: boolean;
};

export function SellForm({ initial, categories, cities, needsContact }: Props) {
  const t = useTranslations("sell");
  const te = useTranslations("errors");
  const tc = useTranslations("condition");
  const [state, action, pending] = useActionState<SaveListingState, FormData>(saveListingAction, null);
  const [images, setImages] = useState<UploadedImage[]>(initial.images);
  // Controlled fields: React 19 resets uncontrolled forms after an action, which would wipe input on validation errors.
  const [v, setV] = useState({
    title: initial.title,
    description: initial.description,
    categoryId: initial.categoryId,
    cityId: initial.cityId,
    condition: initial.condition,
    price: initial.price,
    referencePrice: initial.referencePrice,
    referencePriceSource: initial.referencePriceSource,
    locationNote: initial.locationNote,
    whatsapp: "",
    contactConsent: false,
  });
  const bind = (k: Exclude<keyof typeof v, "contactConsent">) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((p) => ({ ...p, [k]: e.target.value })),
  });
  const { title, price, cityId, condition } = v;
  const [showRef, setShowRef] = useState(Boolean(initial.referencePrice));
  const fe = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const err = (k: string) => (fe[k] ? te(fe[k]) : null);
  const live = initial.status === "ACTIVE";
  const priceMinor = parsePriceToMinor(price, initial.currency);
  const cityName = cities.find((c) => c.id === cityId)?.name ?? "";

  const errProps = (k: string) => (fe[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-err` } : {});
  const errorText = (k: string) =>
    fe[k] ? (
      <p id={`${k}-err`} className="error">
        {err(k)}
      </p>
    ) : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_.8fr] lg:gap-10">
      <form action={action} className="panel max-md:border-0 max-md:bg-transparent max-md:p-0" noValidate>
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        <input type="hidden" name="currency" value={initial.currency} />
        {images.map((img) => (
          <input key={img.id} type="hidden" name="imageIds" value={img.id} />
        ))}

        {live && (
          <p role="note" className="mb-5 rounded-[var(--radius-sm)] bg-sage p-3 text-sm text-sage-ink">
            {t("liveEditNotice")}
          </p>
        )}

        <fieldset>
          <legend className="label mb-2">{t("photos")}</legend>
          <ImageUploader value={images} onChange={setImages} invalid={Boolean(fe.imageIds)} />
          {errorText("imageIds")}
        </fieldset>

        <div className="field mt-4">
          <label htmlFor="title">{t("title")}</label>
          <input id="title" name="title" required minLength={5} maxLength={80} {...bind("title")} placeholder={t("titlePlaceholder")} enterKeyHint="next" className="input" {...errProps("title")} />
          {errorText("title")}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="categoryId">{t("category")}</label>
            <select id="categoryId" name="categoryId" required {...bind("categoryId")} className="input" {...errProps("categoryId")}>
              <option value="" disabled>
                {t("choose")}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {errorText("categoryId")}
          </div>
          <div className="field">
            <label htmlFor="cityId">{t("city")}</label>
            <select id="cityId" name="cityId" required {...bind("cityId")} className="input" {...errProps("cityId")}>
              <option value="" disabled>
                {t("choose")}
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errorText("cityId")}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="price">{t("price", { currency: initial.currency === "EUR" ? "€" : "L" })}</label>
            <input id="price" name="price" required inputMode="decimal" {...bind("price")} placeholder="299" className="input" {...errProps("price")} />
            {errorText("price")}
          </div>
          <div className="field">
            <label htmlFor="condition">{t("condition")}</label>
            <select id="condition" name="condition" required {...bind("condition")} className="input" {...errProps("condition")}>
              <option value="" disabled>
                {t("choose")}
              </option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {tc(c)}
                </option>
              ))}
            </select>
            {errorText("condition")}
          </div>
        </div>
        <p className="hint mt-2">{live ? t("priceLiveHint") : t("priceHint")}</p>

        <div className="field mt-4">
          <label htmlFor="description">{t("description")}</label>
          <textarea id="description" name="description" required minLength={20} maxLength={2000} rows={4} {...bind("description")} placeholder={t("descriptionPlaceholder")} className="input" {...errProps("description")} />
          {errorText("description")}
        </div>

        <div className="field mt-4">
          <label htmlFor="locationNote">{t("locationNote")}</label>
          <input id="locationNote" name="locationNote" maxLength={60} {...bind("locationNote")} placeholder={t("locationPlaceholder")} className="input" />
          <p className="hint">{t("locationHint")}</p>
        </div>

        <details className="mt-4 rounded-[var(--radius-sm)] border border-line bg-white p-3" open={showRef} onToggle={(e) => setShowRef(e.currentTarget.open)}>
          <summary className="cursor-pointer text-sm font-semibold">{t("referenceToggle")}</summary>
          <p className="hint mt-2">{t("referenceHint")}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="field">
              <label htmlFor="referencePrice">{t("referencePrice")}</label>
              <input id="referencePrice" name="referencePrice" inputMode="decimal" {...bind("referencePrice")} className="input" {...errProps("referencePrice")} />
              {errorText("referencePrice")}
            </div>
            <div className="field">
              <label htmlFor="referencePriceSource">{t("referenceSource")}</label>
              <input id="referencePriceSource" name="referencePriceSource" maxLength={120} {...bind("referencePriceSource")} placeholder={t("referenceSourcePlaceholder")} className="input" {...errProps("referencePriceSource")} />
              {errorText("referencePriceSource")}
            </div>
          </div>
        </details>

        {needsContact && (
          <fieldset className="mt-5 rounded-[var(--radius-md)] border border-line bg-white p-4">
            <legend className="label px-1">{t("contactTitle")}</legend>
            <p className="hint mb-3">{t("contactHint")}</p>
            <div className="field">
              <label htmlFor="whatsapp">{t("whatsapp")}</label>
              <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="069 123 4567" {...bind("whatsapp")} className="input" {...errProps("whatsapp")} />
              {errorText("whatsapp")}
            </div>
            <label className="check mt-3">
              <input type="checkbox" name="contactConsent" checked={v.contactConsent} onChange={(e) => setV((p) => ({ ...p, contactConsent: e.target.checked }))} />
              <span>{t("contactConsent")}</span>
            </label>
          </fieldset>
        )}

        {state && !state.ok && state.code !== "VALIDATION" && (
          <p role="alert" className="error mt-4">
            {te(state.messageKey)}
          </p>
        )}
        {state && !state.ok && state.code === "VALIDATION" && (
          <p role="alert" className="error mt-4">
            {te("fix_fields")}
          </p>
        )}

        <div className="actionbar mt-6 max-md:mt-0">
          <button type="submit" name="intent" value="draft" className="btn btn-line btn-lg flex-1 md:flex-none" disabled={pending}>
            {t("saveDraft")}
          </button>
          <button type="submit" name="intent" value="preview" className="btn btn-ink btn-lg flex-[2] md:flex-1" disabled={pending}>
            {live ? t("saveChanges") : t("continue")}
          </button>
        </div>
        <p className="hint mt-3 max-md:mb-4">{t("rules")}</p>
      </form>

      <aside className="sticky top-[calc(var(--hdr)+24px)] max-lg:hidden" aria-hidden>
        <p className="mb-3 text-sm font-semibold text-muted">{t("previewLabel")}</p>
        <div className="card pointer-events-none max-w-[340px]">
          <div className="relative aspect-[4/3] overflow-hidden bg-placeholder">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview
              <img src={images[0].url} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-muted-2">
                <Camera className="size-8" />
              </div>
            )}
            {condition === "NEW" && <span className="tag">{tc("NEW")}</span>}
          </div>
          <div className="px-4 pt-3.5">
            <h3 className="line-clamp-2 text-[15px] font-semibold">{title || t("titlePreview")}</h3>
            <strong className="price mt-2 block text-[25px]">{priceMinor ? formatPrice(priceMinor, initial.currency) : `— ${initial.currency === "EUR" ? "€" : "L"}`}</strong>
            <div className="mt-2 flex gap-3 text-[13px] text-muted">
              {cityName && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {cityName}
                </span>
              )}
              {condition && <span>{tc(condition)}</span>}
            </div>
          </div>
          <div className="px-4 pt-3.5 pb-4">
            <div className="fuse">
              <i />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
              <Clock className="size-[15px]" />
              {t("previewTimer")}
              <b className="num text-ink">48h 00m</b>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
