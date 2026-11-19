/** Pure promotion rules. A promotion never extends a listing's 48h validity. */
import { HOUR_MS } from "@/lib/time";
import { effectiveStatus, type ListingStatus } from "@/features/listings/rules";

export const MIN_PROMOTION_REMAINING_MS = HOUR_MS;

type L = { status: ListingStatus; publishedAt: Date | null; expiresAt: Date | null };
type P = { placement: string | null; durationHours: number | null; active: boolean };

export type Eligibility = { ok: true; startsAt: Date; endsAt: Date } | { ok: false; reason: "listing_not_active" | "too_little_time" | "product_unavailable" | "already_promoted" };

export function promotionEligibility(listing: L, product: P, activePlacements: string[], now: Date): Eligibility {
  if (!product.active || !product.placement) return { ok: false, reason: "product_unavailable" };
  if (effectiveStatus(listing, now) !== "ACTIVE" || !listing.expiresAt) return { ok: false, reason: "listing_not_active" };
  const remaining = listing.expiresAt.getTime() - now.getTime();
  if (remaining < MIN_PROMOTION_REMAINING_MS) return { ok: false, reason: "too_little_time" };
  if (activePlacements.includes(product.placement)) return { ok: false, reason: "already_promoted" };
  const wanted = product.durationHours ? now.getTime() + product.durationHours * HOUR_MS : listing.expiresAt.getTime();
  return { ok: true, startsAt: now, endsAt: new Date(Math.min(wanted, listing.expiresAt.getTime())) };
}

export function isPro(user: { proUntil: Date | null }, now: Date): boolean {
  return Boolean(user.proUntil && user.proUntil.getTime() > now.getTime());
}
