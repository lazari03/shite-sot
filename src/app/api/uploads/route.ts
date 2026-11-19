import { NextResponse } from "next/server";
import { requireUser } from "@/server/authz";
import { rateLimit } from "@/server/rate-limit";
import { assertSameOrigin, errorResponse } from "@/server/http";
import { AppError } from "@/server/errors";
import { processUpload } from "@/features/media/service";
import { MAX_UPLOAD_BYTES } from "@/features/media/images";

export const runtime = "nodejs";

/** Multipart upload of ONE image. Decoded + re-encoded server-side; returns the image id. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    await rateLimit("upload", user.id);
    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > MAX_UPLOAD_BYTES + 64 * 1024) throw new AppError("VALIDATION", "upload_too_large");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("VALIDATION", "upload_not_image");
    if (file.size > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION", "upload_too_large");
    const result = await processUpload(user.id, { bytes: Buffer.from(await file.arrayBuffer()), size: file.size });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return errorResponse(e);
  }
}
