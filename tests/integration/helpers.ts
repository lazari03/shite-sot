import sharp from "sharp";
import { db } from "@/server/db";
import type { Actor } from "@/features/auth/policy";
import { processUpload } from "@/features/media/service";
import type { ListingInputValue } from "@/features/listings/schema";

export async function resetDb() {
  await db.$executeRawUnsafe(
    `TRUNCATE "AnalyticsEvent", "AuditLog", "Promotion", "Payment", "Report", "Favorite", "PriceHistory", "ListingImage", "Listing", "session", "account", "verification", "RateLimit", "Heartbeat", "user" CASCADE`,
  );
}

let n = 0;
export async function makeUser(o: { role?: "USER" | "ADMIN"; trusted?: boolean; whatsapp?: string | null; consent?: boolean } = {}): Promise<Actor> {
  n++;
  const u = await db.user.create({
    data: {
      id: crypto.randomUUID(),
      email: `u${n}-${Date.now()}@test.invalid`,
      name: `User ${n}`,
      emailVerified: true,
      role: o.role ?? "USER",
      trusted: o.trusted ?? false,
      whatsapp: o.whatsapp === undefined ? "355691234567" : o.whatsapp,
      contactConsent: o.consent ?? true,
    },
  });
  return { id: u.id, role: u.role, banned: false, trusted: u.trusted };
}

export async function pngBuffer(w = 800, h = 600, color = "#c6f24e") {
  return sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();
}

export async function uploadImage(ownerId: string) {
  const bytes = await pngBuffer();
  return processUpload(ownerId, { bytes, size: bytes.length });
}

export async function refs() {
  const category = await db.category.findUniqueOrThrow({ where: { slug: "telefona" } });
  const sub = await db.category.findUniqueOrThrow({ where: { slug: "iphone" } });
  const city = await db.city.findUniqueOrThrow({ where: { slug: "tirane" } });
  const city2 = await db.city.findUniqueOrThrow({ where: { slug: "durres" } });
  return { category, sub, city, city2 };
}

export async function input(ownerId: string, o: Partial<ListingInputValue> = {}): Promise<ListingInputValue> {
  const { sub, city } = await refs();
  const img = o.imageIds ? null : await uploadImage(ownerId);
  return {
    title: "iPhone 13 Pro 128GB",
    description: "Gjendje shumë e mirë, bateria 88%, me kuti dhe kabllo.",
    categoryId: sub.id,
    cityId: city.id,
    condition: "VERY_GOOD",
    currency: "EUR",
    priceMinor: 35000,
    referencePriceMinor: null,
    referencePriceSource: null,
    locationNote: null,
    imageIds: img ? [img.id] : [],
    ...o,
  };
}
