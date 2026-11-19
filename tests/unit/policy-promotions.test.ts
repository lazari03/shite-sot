import { describe, expect, it } from "vitest";
import { canManageListing, isAdmin, isListingOwner, needsModeration, type Actor } from "@/features/auth/policy";
import { promotionEligibility, isPro } from "@/features/promotions/rules";
import { safeNext } from "@/features/auth/client";

const user = (o: Partial<Actor> = {}): Actor => ({ id: "u1", role: "USER", banned: false, trusted: false, ...o });

describe("authorization helpers", () => {
  it("only the owner or an admin manages a listing", () => {
    expect(canManageListing(user(), { sellerId: "u1" })).toBe(true);
    expect(canManageListing(user({ id: "u2" }), { sellerId: "u1" })).toBe(false);
    expect(canManageListing(user({ id: "a", role: "ADMIN" }), { sellerId: "u1" })).toBe(true);
    expect(canManageListing(null, { sellerId: "u1" })).toBe(false);
  });
  it("banned users have no rights, even admins", () => {
    expect(canManageListing(user({ banned: true }), { sellerId: "u1" })).toBe(false);
    expect(isAdmin(user({ role: "ADMIN", banned: true }))).toBe(false);
  });
  it("seller actions are owner-only (admins moderate instead)", () => {
    expect(isListingOwner(user({ id: "a", role: "ADMIN" }), { sellerId: "u1" })).toBe(false);
    expect(isListingOwner(user(), { sellerId: "u1" })).toBe(true);
  });
  it("moderation policy", () => {
    expect(needsModeration({ mode: "first_n", trusted: false, approvedCount: 0, trustAfter: 3 })).toBe(true);
    expect(needsModeration({ mode: "first_n", trusted: false, approvedCount: 3, trustAfter: 3 })).toBe(false);
    expect(needsModeration({ mode: "first_n", trusted: true, approvedCount: 0, trustAfter: 3 })).toBe(false);
    expect(needsModeration({ mode: "all", trusted: false, approvedCount: 99, trustAfter: 3 })).toBe(true);
    expect(needsModeration({ mode: "none", trusted: false, approvedCount: 0, trustAfter: 3 })).toBe(false);
  });
  it("safeNext blocks open redirects", () => {
    expect(safeNext("/paneli")).toBe("/paneli");
    expect(safeNext("//evil.com")).toBe("/paneli");
    expect(safeNext("https://evil.com")).toBe("/paneli");
    expect(safeNext("/\\evil.com")).toBe("/paneli");
    expect(safeNext(undefined, "/")).toBe("/");
  });
});

describe("promotion eligibility", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  const h = (n: number) => new Date(now.getTime() + n * 3_600_000);
  const live = { status: "ACTIVE" as const, publishedAt: h(-10), expiresAt: h(38) };
  const featured = { placement: "FEATURED", durationHours: null, active: true };

  it("ends no later than the listing (never extends validity)", () => {
    const r = promotionEligibility(live, featured, [], now);
    expect(r).toEqual({ ok: true, startsAt: now, endsAt: h(38) });
    const r2 = promotionEligibility(live, { ...featured, durationHours: 100 }, [], now);
    expect(r2.ok && r2.endsAt).toEqual(h(38));
    const r3 = promotionEligibility(live, { ...featured, durationHours: 24 }, [], now);
    expect(r3.ok && r3.endsAt).toEqual(h(24));
  });
  it("refuses expired/sold listings, near-expiry, duplicates and inactive products", () => {
    expect(promotionEligibility({ ...live, expiresAt: h(-1) }, featured, [], now)).toEqual({ ok: false, reason: "listing_not_active" });
    expect(promotionEligibility({ ...live, status: "SOLD" }, featured, [], now)).toEqual({ ok: false, reason: "listing_not_active" });
    expect(promotionEligibility({ ...live, expiresAt: h(0.5) }, featured, [], now)).toEqual({ ok: false, reason: "too_little_time" });
    expect(promotionEligibility(live, featured, ["FEATURED"], now)).toEqual({ ok: false, reason: "already_promoted" });
    expect(promotionEligibility(live, { ...featured, active: false }, [], now)).toEqual({ ok: false, reason: "product_unavailable" });
    expect(promotionEligibility(live, { ...featured, placement: null }, [], now)).toEqual({ ok: false, reason: "product_unavailable" });
  });
  it("pro plan", () => {
    expect(isPro({ proUntil: h(1) }, now)).toBe(true);
    expect(isPro({ proUntil: h(-1) }, now)).toBe(false);
    expect(isPro({ proUntil: null }, now)).toBe(false);
  });
});
