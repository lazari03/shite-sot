import "server-only";
import type { Listing, Prisma } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";
import { audit } from "@/server/audit";
import { AppError } from "@/server/errors";
import { activationOutcome, canUnmarkSold, isAllowedTransition, type ListingStatus, type TransitionReason } from "./rules";

type Options = {
  /** Who performed it. null = system (worker). */
  actorId: string | null;
  /** Set when an admin performs a moderation action — written to AuditLog. */
  asAdmin?: boolean;
  note?: string;
  now?: Date;
  expectedAiReview?: { updatedAt: Date; checkedAt: Date };
};

/**
 * The single place that changes Listing.status.
 * Uses a conditional update (status must still equal the value we read) so concurrent
 * transitions can't both win.
 */
export async function transitionListing(tx: Tx, listing: Listing, reason: TransitionReason, requested: ListingStatus | "AUTO", opts: Options): Promise<Listing> {
  const now = opts.now ?? new Date();
  const data: Prisma.ListingUpdateInput = {};
  let to: ListingStatus;

  switch (reason) {
    case "submit":
    case "approve": {
      if (reason === "submit" && requested === "PENDING_REVIEW") {
        to = "PENDING_REVIEW";
        data.submittedAt = now;
        data.aiModerationCheckedAt = null;
        break;
      }
      const out = activationOutcome(listing, now);
      to = out.status;
      data.publishedAt = out.publishedAt;
      data.expiresAt = out.expiresAt;
      if (reason === "submit") data.submittedAt = now;
      if (to === "EXPIRED") data.expiredAt = now;
      break;
    }
    case "unmark_sold":
      if (!canUnmarkSold(listing, now)) throw new AppError("INVALID_STATE", "listing_window_closed");
      to = "ACTIVE";
      data.soldAt = null;
      break;
    case "mark_sold":
      if (!listing.expiresAt || listing.expiresAt <= now) throw new AppError("INVALID_STATE", "listing_expired");
      to = "SOLD";
      data.soldAt = now;
      break;
    case "expire":
      if (listing.expiresAt && listing.expiresAt > now) throw new AppError("INVALID_STATE", "listing_not_due");
      to = "EXPIRED";
      data.expiredAt = now;
      break;
    case "reject":
      to = "REJECTED";
      data.rejectionReason = opts.note ?? null;
      break;
    case "remove":
      to = "REMOVED";
      data.removedAt = now;
      break;
    case "withdraw":
      to = "DRAFT";
      break;
    case "material_edit":
      to = "PENDING_REVIEW";
      data.submittedAt = now;
      data.aiModerationCheckedAt = null;
      break;
  }

  if (requested !== "AUTO" && requested !== to && !(reason === "approve" || reason === "submit")) {
    throw new AppError("INVALID_STATE", "invalid_transition");
  }
  if (!isAllowedTransition(reason, listing.status, to)) throw new AppError("INVALID_STATE", "invalid_transition");

  if (reason === "approve" || reason === "reject") {
    data.reviewedAt = now;
    data.reviewedById = opts.actorId;
    if (reason === "approve") data.rejectionReason = null;
  }
  data.status = to;

  const res = await tx.listing.updateMany({
    where: {
      id: listing.id,
      status: listing.status,
      ...(opts.expectedAiReview && {
        updatedAt: opts.expectedAiReview.updatedAt,
        aiModerationCheckedAt: opts.expectedAiReview.checkedAt,
      }),
    },
    data: data as Prisma.ListingUpdateManyMutationInput,
  });
  if (res.count !== 1) throw new AppError("CONFLICT", "listing_changed");
  const updated = await tx.listing.findUniqueOrThrow({ where: { id: listing.id } });

  // First activation: record the opening price so future price analysis has a baseline.
  if (to === "ACTIVE" && !listing.publishedAt) {
    await tx.priceHistory.create({ data: { listingId: listing.id, priceMinor: listing.priceMinor, currency: listing.currency, changedAt: now } });
  }

  const eventType =
    to === "ACTIVE" && (reason === "submit" || reason === "approve")
      ? "LISTING_ACTIVATED"
      : to === "EXPIRED"
        ? "LISTING_EXPIRED"
        : to === "SOLD"
          ? "LISTING_SOLD"
          : to === "PENDING_REVIEW" && reason === "submit"
            ? "LISTING_SUBMITTED"
            : null;
  if (eventType) {
    await tx.analyticsEvent.create({ data: { type: eventType, listingId: listing.id, categoryId: listing.categoryId, userId: opts.actorId } });
  }
  if (reason === "submit" && to === "ACTIVE") {
    await tx.analyticsEvent.create({ data: { type: "LISTING_SUBMITTED", listingId: listing.id, categoryId: listing.categoryId, userId: opts.actorId } });
  }

  if (opts.asAdmin) {
    await audit(tx, {
      actorId: opts.actorId,
      action: `listing.${reason}`,
      entity: "Listing",
      entityId: listing.id,
      before: { status: listing.status },
      after: { status: to, note: opts.note ?? null },
    });
  }

  // A listing that leaves ACTIVE ends any running promotion (promotions never outlive availability).
  if (to !== "ACTIVE") {
    await tx.promotion.updateMany({ where: { listingId: listing.id, status: "ACTIVE" }, data: { status: "ENDED", endsAt: now } });
  }
  return updated;
}
