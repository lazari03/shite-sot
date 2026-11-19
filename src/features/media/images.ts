/** Shared (client-safe) image constants. */
export const IMAGE_SIZES = [320, 640, 1280] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"] as const;
