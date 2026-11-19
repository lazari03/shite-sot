import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { createDraft, deleteListing, expireDueListings, moderateListing, ownerTransition, submitListing, updateListing } from "@/features/listings/service";
import { discoverListings, endingSoonListings, recentListings } from "@/features/listings/queries";
import { DiscoveryFilters } from "@/features/listings/schema";
import { LISTING_LIFETIME_MS } from "@/lib/time";
import { input, makeUser, resetDb, uploadImage } from "./helpers";

const all = DiscoveryFilters.parse({});
const ids = async () => (await discoverListings(all)).items.map((i) => i.id);
const code = async (p: Promise<unknown>) => p.then(() => "OK", (e: unknown) => (e instanceof AppError ? e.messageKey === "VALIDATION" ? Object.values(e.fieldErrors ?? {})[0] : e.messageKey : String(e)));

beforeEach(resetDb);

describe("publication + moderation", () => {
  it("new seller: draft -> pending review -> approved -> public with a 48h server clock", async () => {
    const seller = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const draft = await createDraft(seller, await input(seller.id));
    expect(draft.status).toBe("DRAFT");
    expect(await ids()).not.toContain(draft.id);

    const pending = await submitListing(seller, draft.id);
    expect(pending.status).toBe("PENDING_REVIEW");
    expect(pending.publishedAt).toBeNull(); // clock hasn't started
    expect(await ids()).not.toContain(draft.id);

    const before = Date.now();
    const live = await moderateListing(admin, draft.id, "approve");
    expect(live.status).toBe("ACTIVE");
    expect(live.publishedAt!.getTime()).toBeGreaterThanOrEqual(before - 5);
    expect(live.expiresAt!.getTime() - live.publishedAt!.getTime()).toBe(LISTING_LIFETIME_MS);
    expect(await ids()).toContain(draft.id);

    const history = await db.priceHistory.findMany({ where: { listingId: draft.id } });
    expect(history).toHaveLength(1);
    const events = await db.analyticsEvent.findMany({ where: { listingId: draft.id }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.type)).toEqual(["LISTING_SUBMITTED", "LISTING_ACTIVATED"]);
    const audit = await db.auditLog.findMany({ where: { entityId: draft.id } });
    expect(audit.map((a) => a.action)).toEqual(["listing.approve"]);
  });

  it("submitting requires at least one photo", async () => {
    const seller = await makeUser();
    const draft = await createDraft(seller, await input(seller.id, { imageIds: [] }));
    expect(await code(submitListing(seller, draft.id))).toBe("images_required");
  });

  it("trusted sellers (or after N approvals) publish directly", async () => {
    const trusted = await makeUser({ trusted: true });
    const d = await createDraft(trusted, await input(trusted.id));
    expect((await submitListing(trusted, d.id)).status).toBe("ACTIVE");

    // MODERATION_TRUST_AFTER=2 in tests
    const seller = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    for (let i = 0; i < 2; i++) {
      const l = await createDraft(seller, await input(seller.id));
      await submitListing(seller, l.id);
      await moderateListing(admin, l.id, "approve");
    }
    const third = await createDraft(seller, await input(seller.id));
    expect((await submitListing(seller, third.id)).status).toBe("ACTIVE");
  });

  it("rejection keeps it private; the seller can fix and resubmit", async () => {
    const seller = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const d = await createDraft(seller, await input(seller.id));
    await submitListing(seller, d.id);
    const rejected = await moderateListing(admin, d.id, "reject", "Foto nga interneti");
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe("Foto nga interneti");
    expect((await submitListing(seller, d.id)).status).toBe("PENDING_REVIEW");
  });

  it("a non-admin cannot moderate", async () => {
    const seller = await makeUser();
    const other = await makeUser();
    const d = await createDraft(seller, await input(seller.id));
    await submitListing(seller, d.id);
    expect(await code(moderateListing(other, d.id, "approve"))).toBe("FORBIDDEN");
    expect(await code(moderateListing(seller, d.id, "approve"))).toBe("FORBIDDEN");
  });
});

describe("object-level authorization", () => {
  it("one seller cannot modify another seller's listing", async () => {
    const seller = await makeUser({ trusted: true });
    const attacker = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const l = await createDraft(seller, await input(seller.id));
    expect(await code(updateListing(attacker, l.id, await input(attacker.id)))).toBe("FORBIDDEN");
    expect(await code(submitListing(attacker, l.id))).toBe("FORBIDDEN");
    expect(await code(deleteListing(attacker, l.id))).toBe("FORBIDDEN");
    await submitListing(seller, l.id);
    expect(await code(ownerTransition(attacker, l.id, "mark_sold"))).toBe("FORBIDDEN");
    // Admins moderate, they don't act as the seller.
    expect(await code(ownerTransition(admin, l.id, "mark_sold"))).toBe("FORBIDDEN");
  });

  it("images owned by someone else can't be attached", async () => {
    const seller = await makeUser();
    const other = await makeUser();
    const foreign = await uploadImage(other.id);
    expect(await code(createDraft(seller, await input(seller.id, { imageIds: [foreign.id] })))).toBe("images_invalid");
  });
});

describe("sold + expiry", () => {
  it("mark as sold removes it from discovery; undo keeps the original deadline", async () => {
    const seller = await makeUser({ trusted: true });
    const l = await createDraft(seller, await input(seller.id));
    const live = await submitListing(seller, l.id);
    const sold = await ownerTransition(seller, l.id, "mark_sold");
    expect(sold.status).toBe("SOLD");
    expect(sold.soldAt).not.toBeNull();
    expect(await ids()).not.toContain(l.id);
    expect((await recentListings()).map((r) => r.id)).not.toContain(l.id);

    const back = await ownerTransition(seller, l.id, "unmark_sold");
    expect(back.status).toBe("ACTIVE");
    expect(back.expiresAt).toEqual(live.expiresAt);
    expect(back.publishedAt).toEqual(live.publishedAt);
  });

  it("expired listings are excluded from discovery even before the worker runs, then reconciled idempotently", async () => {
    const seller = await makeUser({ trusted: true });
    const l = await createDraft(seller, await input(seller.id));
    await submitListing(seller, l.id);
    const other = await createDraft(seller, await input(seller.id, { title: "Samsung Galaxy S23 Ultra" }));
    await submitListing(seller, other.id);
    // Controlled clock: move the deadline into the past instead of waiting 48h.
    await db.listing.update({ where: { id: l.id }, data: { publishedAt: new Date(Date.now() - 49 * 3_600_000), expiresAt: new Date(Date.now() - 3_600_000) } });

    const stillActive = await db.listing.findUniqueOrThrow({ where: { id: l.id } });
    expect(stillActive.status).toBe("ACTIVE");
    expect(await ids()).not.toContain(l.id);
    expect(await ids()).toContain(other.id);
    expect((await endingSoonListings()).map((x) => x.id)).not.toContain(l.id);

    expect(await expireDueListings()).toBe(1);
    expect(await expireDueListings()).toBe(0); // idempotent
    const expired = await db.listing.findUniqueOrThrow({ where: { id: l.id } });
    expect(expired.status).toBe("EXPIRED");
    expect(await db.analyticsEvent.count({ where: { listingId: l.id, type: "LISTING_EXPIRED" } })).toBe(1);

    // No relisting, no reopening, no marking as sold after expiry.
    expect(await code(submitListing(seller, l.id))).toBe("invalid_transition");
    expect(await code(ownerTransition(seller, l.id, "unmark_sold"))).toBe("listing_window_closed");
    expect(await code(ownerTransition(seller, l.id, "mark_sold"))).toBe("listing_expired");
  });

  it("a stale ACTIVE row past its deadline can't be marked sold", async () => {
    const seller = await makeUser({ trusted: true });
    const l = await createDraft(seller, await input(seller.id));
    await submitListing(seller, l.id);
    await db.listing.update({ where: { id: l.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await code(ownerTransition(seller, l.id, "mark_sold"))).toBe("listing_expired");
  });

  it("the database refuses ACTIVE rows without a deadline", async () => {
    const seller = await makeUser();
    const l = await createDraft(seller, await input(seller.id));
    await expect(db.listing.update({ where: { id: l.id }, data: { status: "ACTIVE" } })).rejects.toThrow();
  });
});

describe("editing never restarts the timer", () => {
  it("price may only go down on a live listing, and drops are recorded", async () => {
    const seller = await makeUser({ trusted: true });
    const base = await input(seller.id);
    const l = await createDraft(seller, base);
    const live = await submitListing(seller, l.id);
    expect(await code(updateListing(seller, l.id, { ...base, priceMinor: 36000 }))).toBe("price_raise_forbidden");
    const { listing } = await updateListing(seller, l.id, { ...base, priceMinor: 30000 });
    expect(listing.priceMinor).toBe(30000);
    expect(listing.expiresAt).toEqual(live.expiresAt);
    expect(listing.publishedAt).toEqual(live.publishedAt);
    expect(await db.priceHistory.count({ where: { listingId: l.id } })).toBe(2);
  });

  it("material edits by unmoderated sellers go back to review, the clock keeps running", async () => {
    const seller = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const base = await input(seller.id);
    const l = await createDraft(seller, base);
    await submitListing(seller, l.id);
    const live = await moderateListing(admin, l.id, "approve");
    const { listing, sentToReview } = await updateListing(seller, l.id, { ...base, title: "iPhone 13 Pro 256GB" });
    expect(sentToReview).toBe(true);
    expect(listing.status).toBe("PENDING_REVIEW");
    expect(listing.expiresAt).toEqual(live.expiresAt);
    expect(await ids()).not.toContain(l.id);

    // If the window closes during review, approval can't revive it.
    await db.listing.update({ where: { id: l.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await moderateListing(admin, l.id, "approve")).status).toBe("EXPIRED");
  });

  it("sold and expired listings are frozen", async () => {
    const seller = await makeUser({ trusted: true });
    const base = await input(seller.id);
    const l = await createDraft(seller, base);
    await submitListing(seller, l.id);
    await ownerTransition(seller, l.id, "mark_sold");
    expect(await code(updateListing(seller, l.id, base))).toBe("listing_not_editable");
  });

  it("only never-published drafts can be deleted", async () => {
    const seller = await makeUser({ trusted: true });
    const d = await createDraft(seller, await input(seller.id));
    await deleteListing(seller, d.id);
    expect(await db.listing.findUnique({ where: { id: d.id } })).toBeNull();
    const l = await createDraft(seller, await input(seller.id));
    await submitListing(seller, l.id);
    expect(await code(deleteListing(seller, l.id))).toBe("listing_not_deletable");
  });
});
