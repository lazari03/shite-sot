import "server-only";
import sharp from "sharp";
import { db } from "@/server/db";
import { storage } from "@/server/storage";
import { AppError } from "@/server/errors";
import { MAX_UPLOAD_BYTES } from "@/features/media/images";
import { createId } from "@/features/media/id";
import { transitionListing } from "@/features/listings/state";

export async function setAvatar(userId: string, bytes: Buffer) {
  if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION", "upload_too_large");
  let out: Buffer;
  try {
    out = await sharp(bytes, { limitInputPixels: 50_000_000 }).rotate().resize(256, 256, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
  } catch {
    throw new AppError("VALIDATION", "upload_not_image");
  }
  const key = `a/${userId}/${createId()}`;
  await storage().put(`${key}/256.webp`, out, "image/webp");
  const prev = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { image: true } });
  const url = storage().publicUrl(`${key}/256.webp`);
  await db.user.update({ where: { id: userId }, data: { image: url } });
  const prevKey = prev.image?.match(/(a\/[^/]+\/[a-z0-9]+)\/256\.webp$/)?.[1];
  if (prevKey) await storage().deletePrefix(prevKey).catch(() => undefined);
  return url;
}

/**
 * Account deletion: unpublish everything, delete drafts, scrub PII, kill sessions.
 * The row stays (soft delete) so moderation/audit history remains consistent.
 */
export async function deleteAccount(userId: string) {
  const now = new Date();
  await db.$transaction(async (tx) => {
    const live = await tx.listing.findMany({ where: { sellerId: userId, status: { in: ["ACTIVE", "PENDING_REVIEW", "SOLD", "EXPIRED", "REJECTED"] } } });
    for (const l of live) {
      await transitionListing(tx, l, "remove", "REMOVED", { actorId: userId, now, note: "account_deleted" });
    }
    await tx.listing.deleteMany({ where: { sellerId: userId, status: "DRAFT" } });
    await tx.favorite.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: now,
        name: "Përdorues i fshirë",
        email: `deleted+${userId}@deleted.invalid`,
        emailVerified: false,
        image: null,
        whatsapp: null,
        contactConsent: false,
        bio: null,
        city: null,
      },
    });
  });
}
