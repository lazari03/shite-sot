import "server-only";
import { db } from "@/server/db";
import { activeWhere, toCard } from "@/features/listings/queries";

export async function getSellerProfile(id: string, now = new Date()) {
  const seller = await db.user.findFirst({
    where: { id, deletedAt: null, bannedAt: null },
    select: { id: true, name: true, image: true, city: true, bio: true, createdAt: true, verifiedAt: true, proUntil: true },
  });
  if (!seller) return null;
  const [active, soldCount] = await Promise.all([
    db.listing.findMany({
      where: { ...activeWhere(now), sellerId: id },
      orderBy: { expiresAt: "asc" },
      take: 48,
      include: { city: { select: { name: true } }, category: { select: { slug: true } }, images: { orderBy: { position: "asc" }, take: 1, select: { key: true } } },
    }),
    db.listing.count({ where: { sellerId: id, status: "SOLD" } }),
  ]);
  return { seller, active: active.map((l) => toCard(l, now)), soldCount };
}
