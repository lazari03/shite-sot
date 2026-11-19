"use server";

import { parseInput, runAction } from "@/server/action";
import { getCurrentUser } from "@/server/authz";
import { rateLimit } from "@/server/rate-limit";
import { db } from "@/server/db";
import { AppError, type ActionResult } from "@/server/errors";
import { requestFingerprint } from "@/features/analytics/service";
import { ReportInput } from "@/features/listings/schema";

export type ReportState = ActionResult | null;

/** Anyone can report (abuse must be reportable without an account); rate-limited per user or IP. */
export async function reportListingAction(_prev: ReportState, fd: FormData): Promise<ReportState> {
  return runAction(async () => {
    if (String(fd.get("website") ?? "")) return undefined; // honeypot: pretend success
    const input = parseInput(ReportInput, {
      listingId: String(fd.get("listingId") ?? ""),
      reason: String(fd.get("reason") ?? ""),
      details: String(fd.get("details") ?? ""),
    });
    const user = await getCurrentUser();
    const fp = await requestFingerprint();
    await rateLimit("report", user?.id ?? `ip:${fp.visitorHash}`);
    const listing = await db.listing.findUnique({ where: { id: input.listingId }, select: { id: true, sellerId: true } });
    if (!listing) throw new AppError("NOT_FOUND", "NOT_FOUND");
    if (user && user.id === listing.sellerId) throw new AppError("FORBIDDEN", "report_own_listing");
    if (user) {
      const dup = await db.report.findFirst({ where: { listingId: listing.id, reporterId: user.id, status: "OPEN" }, select: { id: true } });
      if (dup) return undefined;
    }
    await db.report.create({ data: { listingId: listing.id, reporterId: user?.id ?? null, reason: input.reason, details: input.details || null } });
    return undefined;
  });
}
