/**
 * Pure listing lifecycle rules. No I/O. Every edge is unit-tested.
 * The ONLY writer of Listing.status is transitionListing() in ./state.ts, which uses these.
 */
import { computeExpiresAt } from "@/lib/time";

export const LISTING_STATUSES = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "SOLD", "EXPIRED", "REJECTED", "REMOVED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export type TransitionReason =
  | "submit" // seller submits (DRAFT/REJECTED -> PENDING_REVIEW | ACTIVE)
  | "withdraw" // seller pulls a pending submission back to DRAFT
  | "approve" // admin approves (PENDING_REVIEW -> ACTIVE | EXPIRED)
  | "reject" // admin rejects
  | "material_edit" // seller changed important info on a live listing -> re-review
  | "mark_sold"
  | "unmark_sold"
  | "expire" // system
  | "remove"; // admin

const EDGES: Record<TransitionReason, { from: ListingStatus[]; to: ListingStatus[] }> = {
  submit: { from: ["DRAFT", "REJECTED"], to: ["PENDING_REVIEW", "ACTIVE", "EXPIRED"] },
  withdraw: { from: ["PENDING_REVIEW"], to: ["DRAFT"] },
  approve: { from: ["PENDING_REVIEW"], to: ["ACTIVE", "EXPIRED"] },
  reject: { from: ["PENDING_REVIEW"], to: ["REJECTED"] },
  material_edit: { from: ["ACTIVE"], to: ["PENDING_REVIEW"] },
  mark_sold: { from: ["ACTIVE"], to: ["SOLD"] },
  unmark_sold: { from: ["SOLD"], to: ["ACTIVE"] },
  expire: { from: ["ACTIVE"], to: ["EXPIRED"] },
  remove: { from: ["DRAFT", "PENDING_REVIEW", "ACTIVE", "SOLD", "EXPIRED", "REJECTED"], to: ["REMOVED"] },
};

export function isAllowedTransition(reason: TransitionReason, from: ListingStatus, to: ListingStatus): boolean {
  const e = EDGES[reason];
  return e.from.includes(from) && e.to.includes(to);
}

type Timed = { status: ListingStatus; publishedAt: Date | null; expiresAt: Date | null };

/** ACTIVE with a passed deadline is EXPIRED, even before the worker reconciles it. */
export function effectiveStatus(l: Timed, now: Date): ListingStatus {
  if (l.status === "ACTIVE" && (!l.expiresAt || l.expiresAt.getTime() <= now.getTime())) return "EXPIRED";
  return l.status;
}

export function isPubliclyAvailable(l: Timed, now: Date): boolean {
  return effectiveStatus(l, now) === "ACTIVE";
}

/**
 * Where does a listing go when it becomes publicly active (submit without review, or approve)?
 * First activation starts the 48h clock. Re-activation keeps the original clock; if it has run out
 * the listing is EXPIRED instead. The timer is never extended.
 */
export function activationOutcome(l: Timed, now: Date): { status: "ACTIVE" | "EXPIRED"; publishedAt: Date; expiresAt: Date } {
  if (!l.publishedAt || !l.expiresAt) {
    return { status: "ACTIVE", publishedAt: now, expiresAt: computeExpiresAt(now) };
  }
  const status = l.expiresAt.getTime() > now.getTime() ? "ACTIVE" : "EXPIRED";
  return { status, publishedAt: l.publishedAt, expiresAt: l.expiresAt };
}

/** SOLD -> ACTIVE is allowed only while the original window is still open. */
export function canUnmarkSold(l: Timed, now: Date): boolean {
  return l.status === "SOLD" && Boolean(l.expiresAt && l.expiresAt.getTime() > now.getTime());
}

/** Which statuses the seller may edit. Expired/sold/removed listings are frozen history. */
export function isEditable(status: ListingStatus): boolean {
  return status === "DRAFT" || status === "REJECTED" || status === "PENDING_REVIEW" || status === "ACTIVE";
}

/** Sellers may hard-delete only listings that were never public. Others stay as history. */
export function isDeletable(l: { status: ListingStatus; publishedAt: Date | null }): boolean {
  return (l.status === "DRAFT" || l.status === "REJECTED") && !l.publishedAt;
}

export type EditableFields = {
  title: string;
  description: string;
  categoryId: string;
  condition: string;
  priceMinor: number;
  imageKeys: string[];
};

/**
 * On a live listing:
 * - price may only go DOWN (a fixed price can't be raised mid-deal);
 * - title/description/category/condition/photos changes are "material" and may need re-review.
 */
export function classifyLiveEdit(before: EditableFields, after: EditableFields): { priceRaised: boolean; material: boolean; priceChanged: boolean } {
  const material =
    before.title.trim() !== after.title.trim() ||
    before.description.trim() !== after.description.trim() ||
    before.categoryId !== after.categoryId ||
    before.condition !== after.condition ||
    before.imageKeys.join("|") !== after.imageKeys.join("|");
  return { priceRaised: after.priceMinor > before.priceMinor, priceChanged: after.priceMinor !== before.priceMinor, material };
}

/** Contact (WhatsApp) is allowed only for available listings whose seller opted in with a number. */
export function canContactSeller(l: Timed, seller: { contactConsent: boolean; whatsapp: string | null; bannedAt?: Date | null }, now: Date): boolean {
  return isPubliclyAvailable(l, now) && seller.contactConsent && Boolean(seller.whatsapp) && !seller.bannedAt;
}
