import { describe, expect, it } from "vitest";
import { formatPrice, minorToInput, parsePriceToMinor } from "@/lib/money";
import { formatClock, formatRemaining, lifeFraction, urgencyFor } from "@/lib/time";
import { normalizePhone, whatsappLink } from "@/lib/phone";
import { slugify, listingSlug } from "@/lib/slug";

describe("price parsing (integer minor units, no floats)", () => {
  it.each([
    ["399", 39900],
    ["399,50", 39950],
    ["399.5", 39950],
    ["1.299,99", 129999],
    ["1,299.99", 129999],
    ["1 299", 129900],
    ["€ 25", 2500],
    ["0,01", 1],
    ["12,345", 1234500],
  ])("EUR %s -> %i", (input, minor) => expect(parsePriceToMinor(input, "EUR")).toBe(minor));

  it.each(["", "abc", "-5", "0", "0,00", "12,3456", "1e5", "99999999"])("rejects %s", (input) => expect(parsePriceToMinor(input, "EUR")).toBeNull());

  it("ALL has no subunit", () => {
    expect(parsePriceToMinor("22000", "ALL")).toBe(22000);
    expect(parsePriceToMinor("22.000", "ALL")).toBe(22000);
    expect(parsePriceToMinor("22000,50", "ALL")).toBeNull();
  });

  it("round-trips for form editing", () => {
    expect(minorToInput(39950, "EUR")).toBe("399,50");
    expect(minorToInput(39900, "EUR")).toBe("399");
    expect(parsePriceToMinor(minorToInput(129905, "EUR"), "EUR")).toBe(129905);
  });

  it("formats in Albanian locale", () => {
    expect(formatPrice(39900, "EUR")).toMatch(/399\s?€/);
    expect(formatPrice(39950, "EUR")).toMatch(/399,50\s?€/);
    expect(formatPrice(22000, "ALL")).toMatch(/22\s?000/);
  });
});

describe("countdown formatting", () => {
  const H = 3_600_000;
  it("matches the spec examples", () => {
    expect(formatRemaining(36 * H + 20 * 60_000)).toBe("36h 20m");
    expect(formatRemaining(12 * H + 5 * 60_000)).toBe("12h 05m");
    expect(formatRemaining(58 * 60_000 + 30_000)).toBe("58m");
    expect(formatRemaining(0)).toBe("");
  });
  it("clock", () => {
    expect(formatClock(11 * H + 42 * 60_000 + 7_000)).toBe("11:42:07");
    expect(formatClock(-5)).toBe("00:00:00");
  });
  it("urgency escalates as the deadline approaches", () => {
    expect(urgencyFor(30 * H)).toBe("calm");
    expect(urgencyFor(5 * H)).toBe("soon");
    expect(urgencyFor(30 * 60_000)).toBe("urgent");
    expect(urgencyFor(0)).toBe("expired");
  });
  it("fuse fraction is clamped", () => {
    expect(lifeFraction(48 * H)).toBe(1);
    expect(lifeFraction(24 * H)).toBe(0.5);
    expect(lifeFraction(-1)).toBe(0);
    expect(lifeFraction(100 * H)).toBe(1);
  });
});

describe("phone + whatsapp", () => {
  it("normalises Albanian local numbers", () => {
    expect(normalizePhone("069 123 4567")).toBe("355691234567");
    expect(normalizePhone("+355 69 123 4567")).toBe("355691234567");
    expect(normalizePhone("00383 44 123 456")).toBe("38344123456");
    expect(normalizePhone("12")).toBeNull();
    expect(normalizePhone("call me")).toBeNull();
  });
  it("builds an encoded wa.me link", () => {
    expect(whatsappLink("355691234567", "Përshëndetje & faleminderit")).toBe("https://wa.me/355691234567?text=P%C3%ABrsh%C3%ABndetje%20%26%20faleminderit");
  });
});

describe("slugs", () => {
  it("handles Albanian letters", () => {
    expect(slugify("Çelës për Kompjuterë")).toBe("celes-per-kompjutere");
    expect(listingSlug("iPhone 15 Pro!")).toMatch(/^iphone-15-pro-[a-z2-9]{6}$/);
    expect(listingSlug("!!!")).toMatch(/^produkt-/);
  });
});
