"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, Pencil, Trash2, Undo2, Send, ExternalLink } from "lucide-react";
import { deleteListingAction, ownerTransitionAction, submitListingAction } from "../actions";

type Props = { id: string; slug: string; status: string; canUnmark: boolean; deletable: boolean; editable: boolean; compact?: boolean; appeal?: boolean };

export function OwnerActions({ id, slug, status, canUnmark, deletable, editable, compact, appeal }: Props) {
  const t = useTranslations("dashboard");
  const te = useTranslations("errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; messageKey?: string; data?: { status?: string } }>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(te(res.messageKey ?? "INTERNAL"));
        return;
      }
      const s = res.data?.status;
      if (s === "PENDING_REVIEW") setMessage(t("sentToReview"));
      else if (s === "ACTIVE") setMessage(t("nowLive"));
      router.refresh();
    });
  }

  const size = compact ? "btn-sm" : "";
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {(status === "DRAFT" || status === "REJECTED") && (
          <button type="button" className={`btn btn-lime ${size}`} disabled={pending} onClick={() => run(() => submitListingAction(id))}>
            <Send className="size-4" aria-hidden />
            {t(appeal || status === "REJECTED" ? "resubmitReview" : "publish")}
          </button>
        )}
        {status === "ACTIVE" && (
          <>
            <Link className={`btn btn-line ${size}`} href={`/p/${slug}`}>
              <ExternalLink className="size-4" aria-hidden />
              {t("view")}
            </Link>
            <button type="button" className={`btn btn-ink ${size}`} disabled={pending} onClick={() => run(() => ownerTransitionAction(id, "mark_sold"), t("confirmSold"))}>
              <CheckCircle2 className="size-4" aria-hidden />
              {t("markSold")}
            </button>
          </>
        )}
        {status === "SOLD" && canUnmark && (
          <button type="button" className={`btn btn-line ${size}`} disabled={pending} onClick={() => run(() => ownerTransitionAction(id, "unmark_sold"))}>
            <Undo2 className="size-4" aria-hidden />
            {t("unmarkSold")}
          </button>
        )}
        {status === "PENDING_REVIEW" && (
          <button type="button" className={`btn btn-line ${size}`} disabled={pending} onClick={() => run(() => ownerTransitionAction(id, "withdraw"))}>
            <Undo2 className="size-4" aria-hidden />
            {t("withdraw")}
          </button>
        )}
        {editable && (
          <Link className={`btn btn-line ${size}`} href={`/paneli/njoftimet/${id}/ndrysho`}>
            <Pencil className="size-4" aria-hidden />
            {t("edit")}
          </Link>
        )}
        {deletable && (
          <button type="button" className={`btn btn-danger ${size}`} disabled={pending} onClick={() => run(async () => {
            const r = await deleteListingAction(id);
            if (r.ok) router.push("/paneli");
            return r;
          }, t("confirmDelete"))}>
            <Trash2 className="size-4" aria-hidden />
            {t("delete")}
          </button>
        )}
      </div>
      <div aria-live="polite">
        {error && <p className="error">{error}</p>}
        {message && <p className="text-sm font-semibold text-sage-ink">{message}</p>}
      </div>
    </div>
  );
}
