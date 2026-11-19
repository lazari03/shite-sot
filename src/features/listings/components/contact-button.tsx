"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { msRemaining } from "@/lib/time";
import { useNow } from "@/ui/clock";

/**
 * Posts to /api/contact/:id, which re-checks eligibility server-side, records the click
 * (a click is traffic, never a sale) and redirects to WhatsApp. Disables itself at expiry.
 */
export function ContactButton({ listingId, expiresAt, serverNow }: { listingId: string; expiresAt: string; serverNow: number }) {
  const t = useTranslations("listing");
  const now = useNow(serverNow);
  const live = msRemaining(expiresAt, now) > 0;
  return (
    <form action={`/api/contact/${listingId}`} method="post" target="_blank" className="flex-1 md:flex-1">
      <button type="submit" className="btn btn-lime btn-lg w-full px-5 md:h-[54px]" disabled={!live}>
        <MessageCircle className="size-5" aria-hidden />
        {live ? t("contact") : t("contactClosed")}
      </button>
    </form>
  );
}
