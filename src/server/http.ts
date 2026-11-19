import "server-only";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { AppError } from "./errors";
import { log } from "./logger";

/** Reject cross-site POSTs to route handlers (Server Actions have this built in). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const site = new URL(env().SITE_URL).origin;
  const self = new URL(req.url).origin;
  if (!origin || (origin !== site && origin !== self)) throw new AppError("FORBIDDEN", "FORBIDDEN");
}

const STATUS: Record<AppError["code"], number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  BANNED: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  INVALID_STATE: 409,
};

export function errorResponse(e: unknown) {
  if (e instanceof AppError) return NextResponse.json({ ok: false, code: e.code, messageKey: e.messageKey }, { status: STATUS[e.code] });
  log.error("route failed", { err: e });
  return NextResponse.json({ ok: false, code: "INTERNAL", messageKey: "INTERNAL" }, { status: 500 });
}
