/**
 * DEV ONLY. Creates clearly labelled DEMO listings so the UI can be developed.
 * Refuses to run in production or staging.
 */
import "dotenv/config";
import sharp from "sharp";
import { db } from "@/server/db";
import { storage } from "@/server/storage";
import { listingSlug } from "@/lib/slug";
import { computeExpiresAt, HOUR_MS } from "@/lib/time";

if (process.env.NODE_ENV === "production" || ["production", "staging"].includes(process.env.APP_ENV ?? "")) {
  console.error("Refusing to seed demo data outside development.");
  process.exit(1);
}

const ITEMS: Array<[title: string, cat: string, city: string, priceEur: number, hoursLeft: number, color: string]> = [
  ["DEMO iPhone 15 Pro 256 GB", "iphone", "tirane", 399, 12.6, "#2b3a32"],
  ["DEMO PlayStation 5 Disk Edition", "konsola", "durres", 279, 5.3, "#1f3328"],
  ["DEMO MacBook Air M2 13 inç", "laptope", "tirane", 620, 29.5, "#3d5245"],
  ["DEMO Atlete Nike Air Max 43", "mode", "shkoder", 55, 2.2, "#5f8a00"],
  ["DEMO Karrige druri natyral", "mobilje", "vlore", 68, 22.2, "#8a6d3b"],
  ["DEMO Canon EOS me objektiv 18–55", "foto-video", "elbasan", 320, 15.7, "#14231b"],
  ["DEMO Biçikletë mali 27.5", "sport", "korce", 180, 40.4, "#646e63"],
  ["DEMO Samsung Galaxy S23", "android", "tirane", 340, 0.8, "#24352b"],
];

async function demoImage(label: string, color: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="960"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="46%" font-family="sans-serif" font-size="140" font-weight="800" fill="#c6f24e" text-anchor="middle">DEMO</text><text x="50%" y="60%" font-family="sans-serif" font-size="44" fill="#ffffff" text-anchor="middle">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const seller = await db.user.upsert({
    where: { email: "demo-seller@example.invalid" },
    create: { id: crypto.randomUUID(), email: "demo-seller@example.invalid", name: "DEMO Shitës", emailVerified: true, city: "Tiranë", whatsapp: "355690000000", contactConsent: true, trusted: true },
    update: {},
  });
  const now = Date.now();
  for (const [title, catSlug, citySlug, price, hoursLeft, color] of ITEMS) {
    const exists = await db.listing.findFirst({ where: { title, sellerId: seller.id } });
    if (exists) continue;
    const cat = await db.category.findUniqueOrThrow({ where: { slug: catSlug } });
    const city = await db.city.findUniqueOrThrow({ where: { slug: citySlug } });
    const publishedAt = new Date(now - (48 - hoursLeft) * HOUR_MS);
    const l = await db.listing.create({
      data: {
        sellerId: seller.id, title, slug: listingSlug(title), categoryId: cat.id, cityId: city.id,
        description: "DEMO — ky është një njoftim shembull vetëm për zhvillim. Nuk është një produkt i vërtetë.",
        priceMinor: price * 100, currency: "EUR", condition: "VERY_GOOD", status: "ACTIVE",
        submittedAt: publishedAt, publishedAt, expiresAt: computeExpiresAt(publishedAt),
        priceHistory: { create: { priceMinor: price * 100, currency: "EUR", changedAt: publishedAt } },
      },
    });
    const png = await demoImage(title.replace("DEMO ", ""), color);
    const key = `l/${seller.id}/demo${l.id}`;
    for (const size of [320, 640, 1280]) {
      await storage().put(`${key}/${size}.webp`, await sharp(png).resize({ width: size }).webp().toBuffer(), "image/webp");
    }
    await db.listingImage.create({ data: { ownerId: seller.id, listingId: l.id, key, width: 1280, height: 960 } });
  }
  console.log("DEMO listings seeded.");
}

main().finally(() => db.$disconnect());
