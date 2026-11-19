import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { EventType, Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { env } from "@/env";
import { log } from "@/server/logger";

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse/i;

export async function requestFingerprint(): Promise<{ ip: string; visitorHash: string; isBot: boolean }> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "0.0.0.0").trim();
  const ua = h.get("user-agent") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  // Daily-rotating salted hash: lets us dedupe without storing IPs or tracking across days.
  const visitorHash = createHash("sha256").update(`${env().ANALYTICS_SALT}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);
  return { ip, visitorHash, isBot: BOT.test(ua) };
}

/**
 * First-party, privacy-conscious events. Traffic events (views, clicks) are NOT transactions.
 * dedupeKey makes repeated refreshes count once.
 */
export async function track(type: EventType, data: { listingId?: string; categoryId?: string; userId?: string | null; meta?: Prisma.InputJsonValue; dedupe?: boolean } = {}): Promise<boolean> {
  try {
    const fp = await requestFingerprint();
    if (fp.isBot) return false;
    const day = new Date().toISOString().slice(0, 10);
    const dedupeKey = data.dedupe ? `${type}:${data.listingId ?? data.categoryId ?? ""}:${data.userId ?? fp.visitorHash}:${day}` : undefined;
    if (dedupeKey) {
      const res = await db.analyticsEvent.createMany({
        data: [{ type, listingId: data.listingId, categoryId: data.categoryId, userId: data.userId ?? null, visitorHash: fp.visitorHash, dedupeKey, meta: data.meta }],
        skipDuplicates: true,
      });
      return res.count === 1;
    }
    await db.analyticsEvent.create({ data: { type, listingId: data.listingId, categoryId: data.categoryId, userId: data.userId ?? null, visitorHash: fp.visitorHash, meta: data.meta } });
    return true;
  } catch (e) {
    log.warn("analytics track failed", { type, err: e });
    return false;
  }
}

/** Count a listing view once per visitor per day and bump the denormalised counter. */
export async function trackListingView(listingId: string, categoryId: string, userId: string | null) {
  const counted = await track("LISTING_VIEW", { listingId, categoryId, userId, dedupe: true });
  if (counted) await db.listing.update({ where: { id: listingId }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);
}
