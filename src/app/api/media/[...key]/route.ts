import { localStorageDriver } from "@/server/storage";

export const runtime = "nodejs";

/** Serves locally stored image variants (dev / single-node). In production use S3 + its public URL. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const driver = localStorageDriver();
  if (!driver) return new Response("Not found", { status: 404 });
  const { key } = await params;
  const path = key.join("/");
  if (!/^[al]\/[a-z0-9-]+\/[a-z0-9]+\/\d+\.webp$/i.test(path)) return new Response("Not found", { status: 404 });
  const buf = await driver.read(path);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
