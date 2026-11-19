"use client";

import { useActionState, useRef } from "react";
import { Flag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { reportListingAction, type ReportState } from "../actions";

const REASONS = ["MISLEADING_PRICE", "FAKE_PHOTOS", "WRONG_CONDITION", "PROHIBITED_ITEM", "SCAM", "DUPLICATE", "OTHER"] as const;

export function ReportDialog({ listingId }: { listingId: string }) {
  const t = useTranslations("report");
  const te = useTranslations("errors");
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<ReportState, FormData>(reportListingAction, null);
  const done = state?.ok;
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted hover:text-clay">
        <Flag className="size-4" aria-hidden />
        {t("open")}
      </button>
      <dialog ref={ref} aria-labelledby="report-title" className="m-auto w-[min(480px,calc(100%-32px))] rounded-[var(--radius-lg)] border border-line p-0 backdrop:bg-[rgba(12,22,16,.5)]">
        <div className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="report-title" className="h-display text-2xl">
              {t("title")}
            </h2>
            <button type="button" className="iconbtn" aria-label={t("close")} onClick={() => ref.current?.close()}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {done ? (
            <p role="status" className="rounded-[var(--radius-sm)] bg-sage p-4 font-semibold text-sage-ink">
              {t("thanks")}
            </p>
          ) : (
            <form action={action} className="grid gap-4">
              <input type="hidden" name="listingId" value={listingId} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <fieldset className="grid gap-2">
                <legend className="label mb-2">{t("reason")}</legend>
                {REASONS.map((r) => (
                  <label key={r} className="check">
                    <input type="radio" name="reason" value={r} required />
                    {t(`reasons.${r}`)}
                  </label>
                ))}
                {fe?.reason && <p className="error">{te(fe.reason)}</p>}
              </fieldset>
              <div className="field">
                <label htmlFor="report-details">{t("details")}</label>
                <textarea id="report-details" name="details" maxLength={500} className="input min-h-[90px]" />
              </div>
              {state && !state.ok && !fe && <p className="error">{te(state.messageKey)}</p>}
              <button type="submit" className="btn btn-ink btn-lg" disabled={pending}>
                {t("submit")}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
