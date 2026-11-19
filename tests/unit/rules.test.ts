import { describe, expect, it } from "vitest";
import {
  activationOutcome,
  canContactSeller,
  canUnmarkSold,
  classifyLiveEdit,
  effectiveStatus,
  isAllowedTransition,
  isDeletable,
  isEditable,
  LISTING_STATUSES,
  type ListingStatus,
  type TransitionReason,
} from "@/features/listings/rules";
import { computeExpiresAt, LISTING_LIFETIME_MS } from "@/lib/time";

const now = new Date("2026-11-19T12:00:00Z");
const h = (n: number) => new Date(now.getTime() + n * 3_600_000);

describe("expiration", () => {
  it("expiresAt is exactly publishedAt + 48h", () => {
    expect(computeExpiresAt(now).getTime() - now.getTime()).toBe(LISTING_LIFETIME_MS);
    expect(computeExpiresAt(now).toISOString()).toBe("2026-11-21T12:00:00.000Z");
  });

  it("ACTIVE with expiresAt <= now is treated as EXPIRED (no worker needed)", () => {
    expect(effectiveStatus({ status: "ACTIVE", publishedAt: h(-48), expiresAt: now }, now)).toBe("EXPIRED");
    expect(effectiveStatus({ status: "ACTIVE", publishedAt: h(-49), expiresAt: h(-1) }, now)).toBe("EXPIRED");
    expect(effectiveStatus({ status: "ACTIVE", publishedAt: h(-47), expiresAt: h(1) }, now)).toBe("ACTIVE");
  });

  it("ACTIVE without expiresAt is never considered live", () => {
    expect(effectiveStatus({ status: "ACTIVE", publishedAt: null, expiresAt: null }, now)).toBe("EXPIRED");
  });

  it("other statuses are unaffected by the clock", () => {
    for (const s of ["SOLD", "DRAFT", "PENDING_REVIEW", "REJECTED", "REMOVED", "EXPIRED"] as const) {
      expect(effectiveStatus({ status: s, publishedAt: h(-100), expiresAt: h(-52) }, now)).toBe(s);
    }
  });
});

describe("activation", () => {
  it("first activation starts the 48h clock now", () => {
    const out = activationOutcome({ status: "PENDING_REVIEW", publishedAt: null, expiresAt: null }, now);
    expect(out).toEqual({ status: "ACTIVE", publishedAt: now, expiresAt: h(48) });
  });

  it("re-activation keeps the original clock (never extended)", () => {
    const out = activationOutcome({ status: "PENDING_REVIEW", publishedAt: h(-10), expiresAt: h(38) }, now);
    expect(out.expiresAt).toEqual(h(38));
    expect(out.publishedAt).toEqual(h(-10));
    expect(out.status).toBe("ACTIVE");
  });

  it("re-activation after the window closed becomes EXPIRED", () => {
    expect(activationOutcome({ status: "PENDING_REVIEW", publishedAt: h(-50), expiresAt: h(-2) }, now).status).toBe("EXPIRED");
  });
});

describe("transition table", () => {
  const allowed: Array<[TransitionReason, ListingStatus, ListingStatus]> = [
    ["submit", "DRAFT", "PENDING_REVIEW"],
    ["submit", "DRAFT", "ACTIVE"],
    ["submit", "REJECTED", "PENDING_REVIEW"],
    ["approve", "PENDING_REVIEW", "ACTIVE"],
    ["approve", "PENDING_REVIEW", "EXPIRED"],
    ["reject", "PENDING_REVIEW", "REJECTED"],
    ["withdraw", "PENDING_REVIEW", "DRAFT"],
    ["material_edit", "ACTIVE", "PENDING_REVIEW"],
    ["mark_sold", "ACTIVE", "SOLD"],
    ["unmark_sold", "SOLD", "ACTIVE"],
    ["expire", "ACTIVE", "EXPIRED"],
    ["remove", "ACTIVE", "REMOVED"],
    ["remove", "EXPIRED", "REMOVED"],
  ];
  it.each(allowed)("%s: %s -> %s is allowed", (r, f, t) => expect(isAllowedTransition(r, f, t)).toBe(true));

  const forbidden: Array<[TransitionReason, ListingStatus, ListingStatus]> = [
    ["submit", "ACTIVE", "ACTIVE"],
    ["submit", "EXPIRED", "ACTIVE"], // no relisting
    ["approve", "DRAFT", "ACTIVE"], // must be submitted first
    ["approve", "EXPIRED", "ACTIVE"],
    ["mark_sold", "EXPIRED", "SOLD"], // expired items can't be "sold"
    ["mark_sold", "DRAFT", "SOLD"],
    ["unmark_sold", "EXPIRED", "ACTIVE"],
    ["expire", "SOLD", "EXPIRED"],
    ["remove", "REMOVED", "REMOVED"],
    ["withdraw", "ACTIVE", "DRAFT"],
  ];
  it.each(forbidden)("%s: %s -> %s is forbidden", (r, f, t) => expect(isAllowedTransition(r, f, t)).toBe(false));

  it("no reason can move a listing out of REMOVED or EXPIRED back to ACTIVE", () => {
    const reasons: TransitionReason[] = ["submit", "withdraw", "approve", "reject", "material_edit", "mark_sold", "unmark_sold", "expire", "remove"];
    for (const r of reasons) {
      expect(isAllowedTransition(r, "REMOVED", "ACTIVE")).toBe(false);
      expect(isAllowedTransition(r, "EXPIRED", "ACTIVE")).toBe(false);
    }
  });
});

describe("sold / unsold", () => {
  it("SOLD -> ACTIVE only while the original window is open", () => {
    expect(canUnmarkSold({ status: "SOLD", publishedAt: h(-10), expiresAt: h(38) }, now)).toBe(true);
    expect(canUnmarkSold({ status: "SOLD", publishedAt: h(-50), expiresAt: h(-2) }, now)).toBe(false);
    expect(canUnmarkSold({ status: "ACTIVE", publishedAt: h(-10), expiresAt: h(38) }, now)).toBe(false);
  });
});

describe("editing", () => {
  const base = { title: "iPhone 14", description: "A".repeat(30), categoryId: "c1", condition: "GOOD", priceMinor: 30000, imageKeys: ["a", "b"] };
  it("price increase on a live listing is flagged", () => {
    expect(classifyLiveEdit(base, { ...base, priceMinor: 31000 }).priceRaised).toBe(true);
    expect(classifyLiveEdit(base, { ...base, priceMinor: 29000 })).toEqual({ priceRaised: false, priceChanged: true, material: false });
  });
  it("title/photos/category changes are material", () => {
    expect(classifyLiveEdit(base, { ...base, title: "iPhone 15" }).material).toBe(true);
    expect(classifyLiveEdit(base, { ...base, imageKeys: ["b", "a"] }).material).toBe(true);
    expect(classifyLiveEdit(base, { ...base, categoryId: "c2" }).material).toBe(true);
    expect(classifyLiveEdit(base, { ...base, title: " iPhone 14 " }).material).toBe(false);
  });
  it("only never-published drafts/rejections are deletable", () => {
    expect(isDeletable({ status: "DRAFT", publishedAt: null })).toBe(true);
    expect(isDeletable({ status: "REJECTED", publishedAt: null })).toBe(true);
    expect(isDeletable({ status: "REJECTED", publishedAt: h(-3) })).toBe(false);
    expect(isDeletable({ status: "EXPIRED", publishedAt: h(-60) })).toBe(false);
  });
  it("expired, sold and removed listings are frozen", () => {
    const editable = LISTING_STATUSES.filter(isEditable);
    expect(editable.sort()).toEqual(["ACTIVE", "DRAFT", "PENDING_REVIEW", "REJECTED"]);
  });
});

describe("contact eligibility", () => {
  const live = { status: "ACTIVE" as const, publishedAt: h(-1), expiresAt: h(47) };
  const seller = { contactConsent: true, whatsapp: "355691234567", bannedAt: null };
  it("allowed for live listings with consenting sellers", () => expect(canContactSeller(live, seller, now)).toBe(true));
  it("refused without consent or number", () => {
    expect(canContactSeller(live, { ...seller, contactConsent: false }, now)).toBe(false);
    expect(canContactSeller(live, { ...seller, whatsapp: null }, now)).toBe(false);
  });
  it("refused for expired, sold, removed listings and banned sellers", () => {
    expect(canContactSeller({ ...live, expiresAt: now }, seller, now)).toBe(false);
    expect(canContactSeller({ ...live, status: "SOLD" }, seller, now)).toBe(false);
    expect(canContactSeller({ ...live, status: "REMOVED" }, seller, now)).toBe(false);
    expect(canContactSeller(live, { ...seller, bannedAt: now }, now)).toBe(false);
  });
});
