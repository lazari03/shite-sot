import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { env } from "@/env";
import { getCurrentUser } from "@/server/authz";
import { rateLimit } from "@/server/rate-limit";
import { assertSameOrigin } from "@/server/http";
import { canContactSeller } from "@/features/listings/rules";
import { requestFingerprint, track } from "@/features/analytics/service";
import { formatPrice } from "@/lib/money";
import { whatsappLink } from "@/lib/phone";

export const runtime = "nodejs";

/**
 * Contact the seller on WhatsApp. Eligibility is re-checked here (expired, sold, removed or
 * non-consenting sellers are refused even via direct calls). The click is recorded as traffic,
 * never as a sale.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = env().SITE_URL;
  try {
    assertSameOrigin(req);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const listing = await db.listing.findUnique({
    where: { id },
    include: { seller: { select: { id: true, whatsapp: true, contactConsent: true, bannedAt: true, deletedAt: true } } },
  });
  if (!listing || listing.seller.deletedAt) return new NextResponse("Not found", { status: 404 });
  const back = NextResponse.redirect(new URL(`/p/${listing.slug}?kontakt=mbyllur`, site), 303);
  if (!canContactSeller(listing, listing.seller, new Date()) || !listing.seller.whatsapp) return back;

  const user = await getCurrentUser();
  if (user?.id === listing.sellerId) return back;
  const fp = await requestFingerprint();
  try {
    await rateLimit("contact", user?.id ?? fp.visitorHash);
  } catch {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const counted = await track("CONTACT_CLICK", { listingId: listing.id, categoryId: listing.categoryId, userId: user?.id ?? null, dedupe: true, meta: { channel: "whatsapp" } });
  if (counted) await db.listing.update({ where: { id: listing.id }, data: { contactClickCount: { increment: 1 } } });

  const url = `${site}/p/${listing.slug}`;
  const message = `Përshëndetje! Jam i interesuar për "${listing.title}" (${formatPrice(listing.priceMinor, listing.currency)}) në ShitShpejt: ${url}`;
  return NextResponse.redirect(whatsappLink(listing.seller.whatsapp, message), 303);
}
