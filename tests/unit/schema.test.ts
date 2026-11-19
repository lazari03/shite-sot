import { describe, expect, it } from "vitest";
import { ListingInput, ContactSettingsInput, DiscoveryFilters } from "@/features/listings/schema";

const valid = { title: "iPhone 13 Pro 128GB", description: "Gjendje shumë e mirë, bateria 88%, me kuti.", categoryId: "c", cityId: "x", condition: "VERY_GOOD", price: "350", imageIds: ["i1"] };

describe("listing input validation", () => {
  it("accepts a valid listing and converts price to minor units", () => {
    const r = ListingInput.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.priceMinor).toBe(35000);
      expect(r.data.currency).toBe("EUR");
      expect(r.data.referencePriceMinor).toBeNull();
    }
  });
  it("rejects bad prices with i18n keys", () => {
    const r = ListingInput.safeParse({ ...valid, price: "abc" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("price_invalid");
  });
  it("reference price must be higher and have a source (no invented discounts)", () => {
    const lower = ListingInput.safeParse({ ...valid, referencePrice: "300", referencePriceSource: "Neptun" });
    expect(!lower.success && lower.error.issues[0]?.message).toBe("reference_not_higher");
    const noSource = ListingInput.safeParse({ ...valid, referencePrice: "900" });
    expect(!noSource.success && noSource.error.issues[0]?.message).toBe("reference_source_required");
    const ok = ListingInput.safeParse({ ...valid, referencePrice: "900", referencePriceSource: "Neptun, nëntor 2026" });
    expect(ok.success && ok.data.referencePriceMinor).toBe(90000);
  });
  it("enforces lengths, condition enum and image cap", () => {
    expect(ListingInput.safeParse({ ...valid, title: "abc" }).success).toBe(false);
    expect(ListingInput.safeParse({ ...valid, description: "short" }).success).toBe(false);
    expect(ListingInput.safeParse({ ...valid, condition: "BROKEN" }).success).toBe(false);
    expect(ListingInput.safeParse({ ...valid, imageIds: Array.from({ length: 9 }, (_, i) => `i${i}`) }).success).toBe(false);
  });
  it("no auction / bidding fields exist", () => {
    const r = ListingInput.safeParse({ ...valid, startingBid: "1", auction: true });
    expect(r.success && "startingBid" in r.data).toBe(false);
  });
});

describe("contact settings", () => {
  it("requires a number when consenting", () => {
    expect(ContactSettingsInput.safeParse({ whatsapp: "", contactConsent: true }).success).toBe(false);
    expect(ContactSettingsInput.parse({ whatsapp: "", contactConsent: false })).toEqual({ whatsapp: null, contactConsent: false });
    expect(ContactSettingsInput.parse({ whatsapp: "0691234567", contactConsent: true })).toEqual({ whatsapp: "355691234567", contactConsent: true });
  });
});

describe("discovery filters", () => {
  it("falls back to safe defaults on garbage input", () => {
    const f = DiscoveryFilters.parse({ sort: "hacker", page: "-3", min: "abc", condition: "X" });
    expect(f.sort).toBe("ending");
    expect(f.page).toBe(1);
    expect(f.min).toBeUndefined();
    expect(f.condition).toBeUndefined();
  });
});
