/**
 * Reference data only (categories, cities, promotion price list). Idempotent; safe in every
 * environment. This is configuration, not marketplace content: no listings, users or stats.
 */
import "dotenv/config";
import { db } from "@/server/db";

const CATEGORIES: Array<{ slug: string; name: string; nameEn: string; children?: Array<{ slug: string; name: string; nameEn: string }> }> = [
  { slug: "telefona", name: "Telefona", nameEn: "Phones", children: [
    { slug: "iphone", name: "iPhone", nameEn: "iPhone" },
    { slug: "android", name: "Android", nameEn: "Android" },
    { slug: "aksesore-telefoni", name: "Aksesorë", nameEn: "Accessories" },
  ] },
  { slug: "kompjutere", name: "Kompjuterë", nameEn: "Computers", children: [
    { slug: "laptope", name: "Laptopë", nameEn: "Laptops" },
    { slug: "desktop", name: "Desktop", nameEn: "Desktops" },
    { slug: "tablete", name: "Tabletë", nameEn: "Tablets" },
    { slug: "komponente", name: "Komponentë", nameEn: "Components" },
  ] },
  { slug: "gaming", name: "Gaming", nameEn: "Gaming", children: [
    { slug: "konsola", name: "Konsola", nameEn: "Consoles" },
    { slug: "lojera", name: "Lojëra", nameEn: "Games" },
  ] },
  { slug: "elektronike", name: "Elektronikë", nameEn: "Electronics", children: [
    { slug: "tv-audio", name: "TV & Audio", nameEn: "TV & Audio" },
    { slug: "foto-video", name: "Foto & Video", nameEn: "Photo & Video" },
  ] },
  { slug: "shtepi", name: "Shtëpi", nameEn: "Home" },
  { slug: "mobilje", name: "Mobilje", nameEn: "Furniture" },
  { slug: "mode", name: "Modë", nameEn: "Fashion" },
  { slug: "sport", name: "Sport", nameEn: "Sport" },
  { slug: "te-tjera", name: "Të tjera", nameEn: "Other" },
];

const CITIES: Array<[slug: string, name: string, country: string, active: boolean]> = [
  ["tirane", "Tiranë", "AL", true], ["durres", "Durrës", "AL", true], ["shkoder", "Shkodër", "AL", true],
  ["vlore", "Vlorë", "AL", true], ["elbasan", "Elbasan", "AL", true], ["korce", "Korçë", "AL", true],
  ["fier", "Fier", "AL", true], ["berat", "Berat", "AL", true], ["lushnje", "Lushnjë", "AL", true],
  ["kavaje", "Kavajë", "AL", true], ["pogradec", "Pogradec", "AL", true], ["gjirokaster", "Gjirokastër", "AL", true],
  ["sarande", "Sarandë", "AL", true], ["lezhe", "Lezhë", "AL", true], ["kukes", "Kukës", "AL", true],
  // Kosovo expansion: present but inactive until launch.
  ["prishtine", "Prishtinë", "XK", false], ["prizren", "Prizren", "XK", false],
];

// Illustrative launch prices; admins change them in /admin/promovimet.
const PRODUCTS = [
  { code: "FEATURED", name: "Okazion i veçuar", placement: "FEATURED" as const, priceMinor: 199, durationHours: null },
  { code: "CATEGORY_SPOTLIGHT", name: "Në krye të kategorisë", placement: "CATEGORY_SPOTLIGHT" as const, priceMinor: 299, durationHours: null },
  { code: "HOMEPAGE_SPOTLIGHT", name: "Në faqen kryesore", placement: "HOMEPAGE_SPOTLIGHT" as const, priceMinor: 499, durationHours: 24 },
  { code: "PRO_MONTHLY", name: "Shitës profesionist (muaj)", placement: null, priceMinor: 1900, durationHours: null },
];

async function main() {
  for (const [i, c] of CATEGORIES.entries()) {
    const parent = await db.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, nameEn: c.nameEn, sortOrder: i * 10 },
      update: {},
    });
    for (const [j, ch] of (c.children ?? []).entries()) {
      await db.category.upsert({ where: { slug: ch.slug }, create: { ...ch, parentId: parent.id, sortOrder: j * 10 }, update: {} });
    }
  }
  for (const [i, [slug, name, country, active]] of CITIES.entries()) {
    await db.city.upsert({ where: { slug }, create: { slug, name, country, active, sortOrder: i }, update: {} });
  }
  for (const p of PRODUCTS) {
    await db.promotionProduct.upsert({ where: { code: p.code }, create: { ...p, currency: "EUR" }, update: {} });
  }
  console.log("Reference data seeded.");
}

main().finally(() => db.$disconnect());
