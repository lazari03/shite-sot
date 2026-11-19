import { NextResponse, type NextRequest } from "next/server";

/**
 * Runtime security headers. CSP lives here (not next.config) because the image host
 * (S3_PUBLIC_URL) is deploy-time configuration, not build-time.
 */
export function proxy(_req: NextRequest) {
  const res = NextResponse.next();
  const imgHost = process.env.S3_PUBLIC_URL ? new URL(process.env.S3_PUBLIC_URL).origin : "";
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    // Next.js inline bootstrap scripts require 'unsafe-inline' without nonces (see docs/SECURITY.md).
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://lh3.googleusercontent.com ${imgHost}`.trim(),
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    "form-action 'self' https://wa.me https://api.whatsapp.com https://accounts.google.com",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);
  if (process.env.APP_ENV === "production" || process.env.APP_ENV === "staging") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/media|favicon.ico|icon.svg|icon-.*\\.png|sw.js|offline.html).*)"],
};
