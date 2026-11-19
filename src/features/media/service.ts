import "server-only";
import sharp, { type Metadata } from "sharp";
import { createId } from "./id";
import { db } from "@/server/db";
import { storage } from "@/server/storage";
import { AppError } from "@/server/errors";
import { IMAGE_SIZES, MAX_UPLOAD_BYTES, type ImageSize } from "./images";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);
const MAX_INPUT_PIXELS = 50_000_000;

export function imageUrl(key: string, size: ImageSize = 640): string {
  return storage().publicUrl(`${key}/${size}.webp`);
}

/**
 * Validate by decoding (never trust the client MIME type), auto-rotate, strip all metadata
 * (EXIF/GPS) and store WebP variants. The original is not kept.
 */
export async function processUpload(ownerId: string, file: { bytes: Buffer; size: number }) {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION", "upload_too_large");

  let meta: Metadata;
  try {
    meta = await sharp(file.bytes, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new AppError("VALIDATION", "upload_not_image");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format) || !meta.width || !meta.height) throw new AppError("VALIDATION", "upload_not_image");
  if (meta.width < 200 || meta.height < 200) throw new AppError("VALIDATION", "upload_too_small");

  const key = `l/${ownerId}/${createId()}`;
  let width = meta.width;
  let height = meta.height;
  try {
    const base = sharp(file.bytes, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();
    for (const size of IMAGE_SIZES) {
      const { data, info } = await base
        .clone()
        .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
        .webp({ quality: size === 320 ? 70 : 80 })
        .toBuffer({ resolveWithObject: true });
      await storage().put(`${key}/${size}.webp`, data, "image/webp");
      if (size === IMAGE_SIZES[IMAGE_SIZES.length - 1]) {
        width = info.width;
        height = info.height;
      }
    }
  } catch (e) {
    await storage().deletePrefix(key).catch(() => undefined);
    if (e instanceof AppError) throw e;
    throw new AppError("VALIDATION", "upload_not_image");
  }

  const image = await db.listingImage.create({ data: { ownerId, key, width, height } });
  return { id: image.id, url: imageUrl(key, 640), width, height };
}

/** Delete uploads that were never attached to a listing (abandoned forms). Idempotent. */
export async function cleanupOrphanImages(olderThanHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000);
  const orphans = await db.listingImage.findMany({ where: { listingId: null, createdAt: { lt: cutoff } }, take: 500 });
  for (const img of orphans) {
    await storage().deletePrefix(img.key);
    await db.listingImage.delete({ where: { id: img.id } }).catch(() => undefined);
  }
  return orphans.length;
}
