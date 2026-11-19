import { siteUrl } from "@/env";
import type { MetadataRoute } from "next";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";
export const revalidate = 600;


/** Only live deals + categories + sellers with live deals. No drafts, no private data. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [listings, categories] = await Promise.all([
    db.listing.findMany({ where: { status: "ACTIVE", expiresAt: { gt: now }, seller: { bannedAt: null, deletedAt: null } }, select: { slug: true, updatedAt: true }, take: 45_000, orderBy: { publishedAt: "desc" } }),
    db.category.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: siteUrl(), changeFrequency: "hourly", priority: 1 },
    ...categories.map((c) => ({ url: `${siteUrl()}/kategori/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "hourly" as const, priority: 0.7 })),
    ...listings.map((l) => ({ url: `${siteUrl()}/p/${l.slug}`, lastModified: l.updatedAt, changeFrequency: "hourly" as const, priority: 0.8 })),
  ];
}
