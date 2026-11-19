import "server-only";
import type { Listing } from "@/generated/prisma/client";
import { db, type Tx } from "@/server/db";
import { env } from "@/env";
import { AppError } from "@/server/errors";
import { needsModeration, isListingOwner, isAdmin, type Actor } from "@/features/auth/policy";
import { listingSlug } from "@/lib/slug";
import { classifyLiveEdit, isDeletable, isEditable } from "./rules";
import type { ListingInputValue } from "./schema";
import { MAX_IMAGES } from "./schema";
import { transitionListing } from "./state";
import { storage } from "@/server/storage";

async function assertRefs(tx: Tx, input: Pick<ListingInputValue, "categoryId" | "cityId">) {
  const [cat, city] = await Promise.all([
    tx.category.findFirst({ where: { id: input.categoryId, active: true }, select: { id: true } }),
    tx.city.findFirst({ where: { id: input.cityId, active: true }, select: { id: true } }),
  ]);
  if (!cat) throw new AppError("VALIDATION", "VALIDATION", { categoryId: "category_required" });
  if (!city) throw new AppError("VALIDATION", "VALIDATION", { cityId: "city_required" });
}

/** Attach the seller's own uploaded images, in the given order. Foreign or unknown IDs are rejected. */
async function attachImages(tx: Tx, listingId: string, ownerId: string, imageIds: string[]) {
  const ids = [...new Set(imageIds)].slice(0, MAX_IMAGES);
  if (ids.length) {
    const owned = await tx.listingImage.findMany({
      where: { id: { in: ids }, ownerId, OR: [{ listingId: null }, { listingId }] },
      select: { id: true },
    });
    if (owned.length !== ids.length) throw new AppError("VALIDATION", "VALIDATION", { imageIds: "images_invalid" });
  }
  // Detach images removed from the listing (they become orphans and get cleaned up).
  await tx.listingImage.updateMany({ where: { listingId, id: { notIn: ids } }, data: { listingId: null } });
  for (const [position, id] of ids.entries()) {
    await tx.listingImage.update({ where: { id }, data: { listingId, position } });
  }
  return ids;
}

export async function createDraft(actor: Actor, input: ListingInputValue): Promise<Listing> {
  return db.$transaction(async (tx) => {
    await assertRefs(tx, input);
    const listing = await tx.listing.create({
      data: {
        sellerId: actor.id,
        slug: listingSlug(input.title),
        title: input.title,
        description: input.description,
        priceMinor: input.priceMinor,
        currency: input.currency,
        referencePriceMinor: input.referencePriceMinor,
        referencePriceSource: input.referencePriceSource,
        categoryId: input.categoryId,
        cityId: input.cityId,
        condition: input.condition,
        locationNote: input.locationNote,
        status: "DRAFT",
      },
    });
    await attachImages(tx, listing.id, actor.id, input.imageIds);
    return listing;
  });
}

export async function updateListing(actor: Actor, listingId: string, input: ListingInputValue): Promise<{ listing: Listing; sentToReview: boolean }> {
  return db.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId }, include: { images: { orderBy: { position: "asc" } } } });
    if (!listing) throw new AppError("NOT_FOUND", "NOT_FOUND");
    if (!isListingOwner(actor, listing)) throw new AppError("FORBIDDEN", "FORBIDDEN");
    if (!isEditable(listing.status)) throw new AppError("INVALID_STATE", "listing_not_editable");
    await assertRefs(tx, input);

    const live = listing.status === "ACTIVE";
    let sentToReview = false;
    if (live) {
      if (listing.expiresAt && listing.expiresAt <= new Date()) throw new AppError("INVALID_STATE", "listing_expired");
      if (input.currency !== listing.currency) throw new AppError("VALIDATION", "VALIDATION", { currency: "currency_locked" });
      const edit = classifyLiveEdit(
        { ...listing, imageKeys: listing.images.map((i) => i.id) },
        { ...input, imageKeys: input.imageIds },
      );
      if (edit.priceRaised) throw new AppError("VALIDATION", "VALIDATION", { price: "price_raise_forbidden" });
      if (input.imageIds.length === 0) throw new AppError("VALIDATION", "VALIDATION", { imageIds: "images_required" });
      if (edit.material) {
        const approvedCount = await tx.listing.count({ where: { sellerId: actor.id, publishedAt: { not: null }, id: { not: listing.id } } });
        sentToReview = needsModeration({ mode: env().MODERATION_MODE, trusted: actor.trusted, approvedCount, trustAfter: env().MODERATION_TRUST_AFTER });
      }
      if (edit.priceChanged) {
        await tx.priceHistory.create({ data: { listingId: listing.id, priceMinor: input.priceMinor, currency: listing.currency } });
      }
    }

    // Note: publishedAt / expiresAt are never touched by edits.
    await tx.listing.update({
      where: { id: listing.id },
      data: {
        title: input.title,
        description: input.description,
        priceMinor: input.priceMinor,
        currency: live ? listing.currency : input.currency,
        referencePriceMinor: input.referencePriceMinor,
        referencePriceSource: input.referencePriceSource,
        categoryId: input.categoryId,
        cityId: input.cityId,
        condition: input.condition,
        locationNote: input.locationNote,
      },
    });
    await attachImages(tx, listing.id, actor.id, input.imageIds);
    let updated = await tx.listing.findUniqueOrThrow({ where: { id: listing.id } });
    if (sentToReview) updated = await transitionListing(tx, updated, "material_edit", "PENDING_REVIEW", { actorId: actor.id });
    return { listing: updated, sentToReview };
  });
}

/** Seller submits a draft (or a rejected listing after fixing it). */
export async function submitListing(actor: Actor, listingId: string): Promise<Listing> {
  return db.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new AppError("NOT_FOUND", "NOT_FOUND");
    if (!isListingOwner(actor, listing)) throw new AppError("FORBIDDEN", "FORBIDDEN");
    const imageCount = await tx.listingImage.count({ where: { listingId } });
    if (imageCount < 1) throw new AppError("VALIDATION", "VALIDATION", { imageIds: "images_required" });
    const seller = await tx.user.findUniqueOrThrow({ where: { id: actor.id }, select: { trusted: true } });
    const approvedCount = await tx.listing.count({ where: { sellerId: actor.id, publishedAt: { not: null } } });
    const review = needsModeration({ mode: env().MODERATION_MODE, trusted: seller.trusted, approvedCount, trustAfter: env().MODERATION_TRUST_AFTER });
    return transitionListing(tx, listing, "submit", review ? "PENDING_REVIEW" : "ACTIVE", { actorId: actor.id });
  });
}

export async function ownerTransition(actor: Actor, listingId: string, reason: "mark_sold" | "unmark_sold" | "withdraw"): Promise<Listing> {
  return db.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new AppError("NOT_FOUND", "NOT_FOUND");
    if (!isListingOwner(actor, listing)) throw new AppError("FORBIDDEN", "FORBIDDEN");
    return transitionListing(tx, listing, reason, "AUTO", { actorId: actor.id });
  });
}

export async function deleteListing(actor: Actor, listingId: string): Promise<void> {
  const keys = await db.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId }, include: { images: true } });
    if (!listing) throw new AppError("NOT_FOUND", "NOT_FOUND");
    if (!isListingOwner(actor, listing)) throw new AppError("FORBIDDEN", "FORBIDDEN");
    if (!isDeletable(listing)) throw new AppError("INVALID_STATE", "listing_not_deletable");
    await tx.listing.delete({ where: { id: listing.id } });
    return listing.images.map((i) => i.key);
  });
  await Promise.allSettled(keys.map((k) => storage().deletePrefix(k)));
}

/** Admin moderation. */
export async function moderateListing(actor: Actor, listingId: string, decision: "approve" | "reject" | "remove", note?: string): Promise<Listing> {
  if (!isAdmin(actor)) throw new AppError("FORBIDDEN", "FORBIDDEN");
  return db.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new AppError("NOT_FOUND", "NOT_FOUND");
    return transitionListing(tx, listing, decision, "AUTO", { actorId: actor.id, asAdmin: true, note });
  });
}

/**
 * Idempotent reconciliation: flip every ACTIVE listing whose deadline passed to EXPIRED.
 * Queries never rely on this (they also filter on expiresAt > now), it only keeps state tidy.
 */
export async function expireDueListings(now = new Date(), batch = 200): Promise<number> {
  let total = 0;
  for (;;) {
    const due = await db.listing.findMany({ where: { status: "ACTIVE", expiresAt: { lte: now } }, take: batch, orderBy: { expiresAt: "asc" } });
    if (!due.length) break;
    for (const l of due) {
      try {
        await db.$transaction((tx) => transitionListing(tx, l, "expire", "EXPIRED", { actorId: null, now }));
        total++;
      } catch (e) {
        // CONFLICT = someone else changed it meanwhile (sold / already expired). Safe to skip.
        if (!(e instanceof AppError)) throw e;
      }
    }
    if (due.length < batch) break;
  }
  return total;
}
