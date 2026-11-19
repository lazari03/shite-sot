import "server-only";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { AppError } from "@/server/errors";
import { isAdmin, type Actor } from "@/features/auth/policy";
import { promotionEligibility } from "./rules";
import type { Tx } from "@/server/db";

async function activePlacements(tx: Tx, listingId: string, now: Date) {
  const rows = await tx.promotion.findMany({ where: { listingId, status: "ACTIVE", endsAt: { gt: now } }, select: { placement: true } });
  return rows.map((r) => r.placement);
}

/** Explicitly authorised administrative grant (no payment). Audited. */
export async function grantPromotion(actor: Actor, input: { listingId: string; productCode: string; note?: string }, now = new Date()) {
  if (!isAdmin(actor)) throw new AppError("FORBIDDEN", "FORBIDDEN");
  return db.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: input.listingId } });
    const product = await tx.promotionProduct.findUnique({ where: { code: input.productCode } });
    if (!listing || !product) throw new AppError("NOT_FOUND", "NOT_FOUND");
    const elig = promotionEligibility(listing, product, await activePlacements(tx, listing.id, now), now);
    if (!elig.ok) throw new AppError("INVALID_STATE", `promotion_${elig.reason}`);
    const promo = await tx.promotion.create({
      data: { listingId: listing.id, productId: product.id, placement: product.placement!, status: "ACTIVE", startsAt: elig.startsAt, endsAt: elig.endsAt, grantedById: actor.id, note: input.note || null },
    });
    await tx.analyticsEvent.create({ data: { type: "PROMOTION_ACTIVATED", listingId: listing.id, userId: actor.id, meta: { source: "admin_grant", product: product.code } } });
    await audit(tx, { actorId: actor.id, action: "promotion.grant", entity: "Promotion", entityId: promo.id, after: { listingId: listing.id, product: product.code, endsAt: elig.endsAt } });
    return promo;
  });
}

/**
 * Called from a verified payment webhook. Idempotent: replaying the same confirmation
 * activates the promotion at most once.
 */
export async function activatePromotionForPayment(providerRef: string, status: "SUCCEEDED" | "FAILED" | "REFUNDED", raw: unknown, now = new Date()) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { providerRef }, include: { promotion: { include: { listing: true, product: true } } } });
    if (!payment) throw new AppError("NOT_FOUND", "NOT_FOUND");
    if (payment.status === "SUCCEEDED" && status === "SUCCEEDED") return payment.promotion; // replay
    await tx.payment.update({ where: { id: payment.id }, data: { status, raw: raw as object } });
    const promo = payment.promotion;
    if (!promo) return null;
    if (status !== "SUCCEEDED") {
      await tx.promotion.update({ where: { id: promo.id }, data: { status: "CANCELLED" } });
      return null;
    }
    if (promo.status !== "PENDING_PAYMENT") return promo;
    const elig = promotionEligibility(promo.listing, promo.product, await activePlacements(tx, promo.listingId, now), now);
    if (!elig.ok) {
      // Paid but no longer eligible (e.g. sold meanwhile): keep a record for a manual refund.
      await tx.promotion.update({ where: { id: promo.id }, data: { status: "CANCELLED", note: `paid_but_${elig.reason}` } });
      return null;
    }
    const updated = await tx.promotion.update({ where: { id: promo.id }, data: { status: "ACTIVE", startsAt: elig.startsAt, endsAt: elig.endsAt } });
    await tx.analyticsEvent.create({ data: { type: "PROMOTION_ACTIVATED", listingId: promo.listingId, userId: payment.userId, meta: { source: "payment", product: promo.product.code } } });
    return updated;
  });
}

/** Worker: end promotions whose window passed. Idempotent. */
export async function endExpiredPromotions(now = new Date()): Promise<number> {
  const r = await db.promotion.updateMany({ where: { status: "ACTIVE", endsAt: { lte: now } }, data: { status: "ENDED" } });
  return r.count;
}
