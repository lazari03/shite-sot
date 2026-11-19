import "server-only";
import { db } from "@/server/db";
import { imageUrl } from "@/features/media/service";
import { effectiveStatus } from "@/features/listings/rules";

export async function sellerDashboard(userId: string, now = new Date()) {
  const listings = await db.listing.findMany({
    where: { sellerId: userId, status: { not: "REMOVED" } },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
    include: { images: { orderBy: { position: "asc" }, take: 1 }, city: { select: { name: true } }, promotions: { where: { status: "ACTIVE", endsAt: { gt: now } }, select: { placement: true, endsAt: true } } },
  });
  const rows = listings.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    priceMinor: l.priceMinor,
    currency: l.currency,
    status: effectiveStatus(l, now),
    expiresAt: l.expiresAt?.toISOString() ?? null,
    publishedAt: l.publishedAt?.toISOString() ?? null,
    rejectionReason: l.rejectionReason,
    views: l.viewCount,
    contactClicks: l.contactClickCount,
    favorites: l.favoriteCount,
    imageUrl: l.images[0] ? imageUrl(l.images[0].key, 320) : null,
    city: l.city.name,
    promotedUntil: l.promotions[0]?.endsAt?.toISOString() ?? null,
  }));
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const metrics = {
    active: count("ACTIVE"),
    expired: count("EXPIRED"),
    sold: count("SOLD"),
    pending: count("PENDING_REVIEW"),
    drafts: count("DRAFT") + count("REJECTED"),
    views: rows.reduce((a, r) => a + r.views, 0),
    contactClicks: rows.reduce((a, r) => a + r.contactClicks, 0),
    favorites: rows.reduce((a, r) => a + r.favorites, 0),
  };
  return { rows, metrics };
}

export async function userFavorites(userId: string) {
  return db.favorite.findMany({
    where: { userId, listing: { status: { in: ["ACTIVE", "SOLD", "EXPIRED"] } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      listing: { include: { city: { select: { name: true } }, category: { select: { slug: true } }, images: { orderBy: { position: "asc" }, take: 1, select: { key: true } } } },
    },
  });
}
