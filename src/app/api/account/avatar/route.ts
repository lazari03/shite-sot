import { NextResponse } from "next/server";
import { requireUser } from "@/server/authz";
import { rateLimit } from "@/server/rate-limit";
import { assertSameOrigin, errorResponse } from "@/server/http";
import { AppError } from "@/server/errors";
import { setAvatar } from "@/features/account/service";
import { MAX_UPLOAD_BYTES } from "@/features/media/images";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    await rateLimit("upload", user.id);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("VALIDATION", "upload_not_image");
    if (file.size > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION", "upload_too_large");
    const url = await setAvatar(user.id, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return errorResponse(e);
  }
}
