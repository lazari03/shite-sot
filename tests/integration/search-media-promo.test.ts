import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { createDraft, submitListing, ownerTransition } from "@/features/listings/service";
import { discoverListings, promotedListings } from "@/features/listings/queries";
import { DiscoveryFilters } from "@/features/listings/schema";
import { processUpload, cleanupOrphanImages } from "@/features/media/service";
import { grantPromotion, activatePromotionForPayment, endExpiredPromotions } from "@/features/promotions/service";
import { deleteAccount } from "@/features/account/service";
import { resolveReport, setUserFlag } from "@/features/admin/service";
import { input, makeUser, pngBuffer, refs, resetDb } from "./helpers";

const err = async (p: Promise<unknown>) => p.then(() => "OK", (e: unknown) => (e instanceof AppError ? e.messageKey : String(e)));

beforeEach(resetDb);

async function publish(title: string, o: Parameters<typeof input>[1] = {}) {
  const seller = await makeUser({ trusted: true });
  const l = await createDraft(seller, await input(seller.id, { title, ...o }));
  return { seller, listing: await submitListing(seller, l.id) };
}

describe("search + filters", () => {
  it("full-text search is accent-insensitive and matches partial words", async () => {
    const { listing: cel } = await publish("Çelular Xiaomi Redmi Note 12");
    const { listing: ip } = await publish("iPhone 15 Pro Max 256GB");
    await publish("Biçikletë mali 27.5");
    const q = async (s: string) => (await discoverListings(DiscoveryFilters.parse({ q: s }))).items.map((i) => i.id);
    expect(await q("celular")).toEqual([cel.id]);
    expect(await q("iphon")).toEqual([ip.id]);
    expect(await q("IPHONE 15")).toEqual([ip.id]);
    expect(await q("playstation")).toEqual([]);
  });

  it("search input is parameterised (no SQL injection)", async () => {
    await publish("iPhone 15 Pro");
    const r = await discoverListings(DiscoveryFilters.parse({ q: `'; DROP TABLE "Listing"; --` }));
    expect(r.items).toEqual([]);
    expect(await db.listing.count()).toBe(1);
    expect((await discoverListings(DiscoveryFilters.parse({ q: "100%_" }))).items).toEqual([]);
  });

  it("filters by category tree, city, condition, price and sorts", async () => {
    const { city2, category } = await refs();
    const { listing: a } = await publish("iPhone 12 mini", { priceMinor: 20000 });
    const { listing: b } = await publish("iPhone 14", { priceMinor: 50000, cityId: city2.id, condition: "LIKE_NEW" });
    const f = (o: Record<string, unknown>) => discoverListings(DiscoveryFilters.parse(o)).then((r) => r.items.map((i) => i.id));
    expect(await f({ category: category.slug })).toHaveLength(2); // parent includes children
    expect(await f({ city: "durres" })).toEqual([b.id]);
    expect(await f({ condition: "LIKE_NEW" })).toEqual([b.id]);
    expect(await f({ max: 300 })).toEqual([a.id]);
    expect(await f({ min: 300 })).toEqual([b.id]);
    expect(await f({ sort: "price_desc" })).toEqual([b.id, a.id]);
    expect(await f({ sort: "price_asc" })).toEqual([a.id, b.id]);
    expect(await f({ sort: "newest" })).toEqual([b.id, a.id]);
    expect(await f({ category: "does-not-exist" })).toEqual([]);
  });

  it("banned sellers' listings disappear from discovery", async () => {
    const { seller, listing } = await publish("PS5 Slim");
    const admin = await makeUser({ role: "ADMIN" });
    await setUserFlag(admin, seller.id, "ban", "spam");
    expect((await discoverListings(DiscoveryFilters.parse({}))).items.map((i) => i.id)).not.toContain(listing.id);
  });
});

describe("image upload validation", () => {
  it("re-encodes valid images to WebP variants and strips metadata", async () => {
    const owner = await makeUser();
    const withExif = await sharp(await pngBuffer(1600, 1200)).jpeg().withMetadata({ exif: { IFD0: { Copyright: "secret-gps" } } }).toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const r = await processUpload(owner.id, { bytes: withExif, size: withExif.length });
    expect(r.width).toBe(1280);
    const stored = await db.listingImage.findUniqueOrThrow({ where: { id: r.id } });
    const { localStorageDriver } = await import("@/server/storage");
    const out = await localStorageDriver()!.read(`${stored.key}/1280.webp`);
    const meta = await sharp(out!).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });

  it("rejects non-images, spoofed files, tiny and oversized files", async () => {
    const owner = await makeUser();
    const html = Buffer.from("<script>alert(1)</script>");
    expect(await err(processUpload(owner.id, { bytes: html, size: html.length }))).toBe("upload_not_image");
    const tiny = await pngBuffer(50, 50);
    expect(await err(processUpload(owner.id, { bytes: tiny, size: tiny.length }))).toBe("upload_too_small");
    expect(await err(processUpload(owner.id, { bytes: tiny, size: 11 * 1024 * 1024 }))).toBe("upload_too_large");
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><script>alert(1)</script></svg>`);
    expect(await err(processUpload(owner.id, { bytes: svg, size: svg.length }))).toBe("upload_not_image");
  });

  it("orphaned uploads are cleaned up", async () => {
    const owner = await makeUser();
    const bytes = await pngBuffer();
    const r = await processUpload(owner.id, { bytes, size: bytes.length });
    await db.listingImage.update({ where: { id: r.id }, data: { createdAt: new Date(Date.now() - 25 * 3_600_000) } });
    expect(await cleanupOrphanImages(24)).toBe(1);
    expect(await db.listingImage.findUnique({ where: { id: r.id } })).toBeNull();
  });
});

describe("promotions", () => {
  it("admin grant activates a labelled placement capped at the listing deadline", async () => {
    const { listing } = await publish("MacBook Air M2");
    const admin = await makeUser({ role: "ADMIN" });
    const promo = await grantPromotion(admin, { listingId: listing.id, productCode: "FEATURED" });
    expect(promo.endsAt).toEqual(listing.expiresAt);
    expect((await promotedListings("FEATURED")).map((p) => p.id)).toEqual([listing.id]);
    expect(await err(grantPromotion(admin, { listingId: listing.id, productCode: "FEATURED" }))).toBe("promotion_already_promoted");
    expect(await db.auditLog.count({ where: { action: "promotion.grant" } })).toBe(1);
  });

  it("non-admins can't grant, and promotions end when the listing is sold", async () => {
    const { seller, listing } = await publish("Nintendo Switch OLED");
    expect(await err(grantPromotion(seller, { listingId: listing.id, productCode: "FEATURED" }))).toBe("FORBIDDEN");
    const admin = await makeUser({ role: "ADMIN" });
    await grantPromotion(admin, { listingId: listing.id, productCode: "HOMEPAGE_SPOTLIGHT" });
    await ownerTransition(seller, listing.id, "mark_sold");
    expect(await promotedListings("HOMEPAGE_SPOTLIGHT")).toEqual([]);
    expect(await db.promotion.count({ where: { status: "ACTIVE" } })).toBe(0);
  });

  it("payment confirmation is idempotent and never fakes success", async () => {
    const { seller, listing } = await publish("GoPro Hero 12");
    const product = await db.promotionProduct.findUniqueOrThrow({ where: { code: "FEATURED" } });
    const payment = await db.payment.create({ data: { userId: seller.id, provider: "test", providerRef: "ref-1", idempotencyKey: "k1", amountMinor: product.priceMinor, currency: "EUR" } });
    await db.promotion.create({ data: { listingId: listing.id, productId: product.id, placement: "FEATURED", paymentId: payment.id } });
    expect(await promotedListings("FEATURED")).toEqual([]); // pending payment = not promoted
    await activatePromotionForPayment("ref-1", "SUCCEEDED", { ok: 1 });
    await activatePromotionForPayment("ref-1", "SUCCEEDED", { ok: 1 });
    await activatePromotionForPayment("ref-1", "SUCCEEDED", { ok: 1 });
    expect(await db.promotion.count({ where: { status: "ACTIVE" } })).toBe(1);
    expect(await db.analyticsEvent.count({ where: { type: "PROMOTION_ACTIVATED" } })).toBe(1);
  });

  it("expired promotions are ended by the worker", async () => {
    const { listing } = await publish("Kindle Paperwhite");
    const admin = await makeUser({ role: "ADMIN" });
    const p = await grantPromotion(admin, { listingId: listing.id, productCode: "HOMEPAGE_SPOTLIGHT" });
    await db.promotion.update({ where: { id: p.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    expect(await endExpiredPromotions()).toBe(1);
    expect(await endExpiredPromotions()).toBe(0);
  });
});

describe("abuse controls", () => {
  it("rate limiter blocks after the configured points", async () => {
    for (let i = 0; i < 10; i++) await rateLimit("report", "subject-a");
    expect(await err(rateLimit("report", "subject-a"))).toBe("RATE_LIMITED");
    expect(await err(rateLimit("report", "subject-b"))).toBe("OK");
  });

  it("removing a reported listing closes all its open reports and is audited", async () => {
    const { listing } = await publish("AirPods Pro 2");
    const admin = await makeUser({ role: "ADMIN" });
    const r1 = await db.report.create({ data: { listingId: listing.id, reason: "SCAM" } });
    await db.report.create({ data: { listingId: listing.id, reason: "FAKE_PHOTOS" } });
    await resolveReport(admin, r1.id, "remove_listing");
    expect((await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe("REMOVED");
    expect(await db.report.count({ where: { status: "OPEN" } })).toBe(0);
    expect(await db.auditLog.count({ where: { action: { in: ["listing.remove", "report.remove_listing"] } } })).toBe(2);
  });

  it("account deletion unpublishes listings and scrubs personal data", async () => {
    const { seller, listing } = await publish("Apple Watch 9");
    await deleteAccount(seller.id);
    const u = await db.user.findUniqueOrThrow({ where: { id: seller.id } });
    expect(u.deletedAt).not.toBeNull();
    expect(u.email).toMatch(/@deleted\.invalid$/);
    expect(u.whatsapp).toBeNull();
    expect(u.contactConsent).toBe(false);
    expect((await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe("REMOVED");
  });
});
