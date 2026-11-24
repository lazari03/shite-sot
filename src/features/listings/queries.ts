import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { ListingCondition, ListingStatus, Currency } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { imageUrl } from "@/features/media/service";
import { effectiveStatus } from "./rules";
import type { DiscoveryFiltersValue } from "./schema";

export const PAGE_SIZE = 24;

export type ListingCard = {
  id: string;
  slug: string;
  title: string;
  priceMinor: number;
  currency: Currency;
  condition: ListingCondition;
  city: string;
  categorySlug: string;
  imageUrl: string | null;
  imageUrlLarge: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  status: ListingStatus;
  promoted: boolean;
  priceAssessment?: { score: number; belowTypical: boolean };
};

const cardInclude = {
  city: { select: { name: true } },
  category: { select: { slug: true } },
  images: { orderBy: { position: "asc" }, take: 1, select: { key: true } },
} satisfies Prisma.ListingInclude;

type CardRow = Prisma.ListingGetPayload<{ include: typeof cardInclude }>;

export function toCard(l: CardRow, now = new Date(), promotedIds?: Set<string>): ListingCard {
  const img = l.images[0];
  const assessment = l.priceAssessment;
  const priceAssessment = assessment && typeof assessment === "object" && !Array.isArray(assessment) &&
    typeof assessment.score === "number" && typeof assessment.belowTypical === "boolean"
    ? { score: assessment.score, belowTypical: assessment.belowTypical }
    : undefined;
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    priceMinor: l.priceMinor,
    currency: l.currency,
    condition: l.condition,
    city: l.city.name,
    categorySlug: l.category.slug,
    imageUrl: img ? imageUrl(img.key, 640) : null,
    imageUrlLarge: img ? imageUrl(img.key, 1280) : null,
    publishedAt: l.publishedAt?.toISOString() ?? null,
    expiresAt: l.expiresAt?.toISOString() ?? null,
    status: effectiveStatus(l, now),
    promoted: promotedIds?.has(l.id) ?? false,
    priceAssessment,
  };
}

/** Base predicate for public discovery. Never relies on the expiry worker. */
export function activeWhere(now = new Date()): Prisma.ListingWhereInput {
  return { status: "ACTIVE", expiresAt: { gt: now }, seller: { bannedAt: null, deletedAt: null } };
}

async function cardsByIds(ids: string[], now: Date, promotedIds?: Set<string>): Promise<ListingCard[]> {
  if (!ids.length) return [];
  const rows = await db.listing.findMany({ where: { id: { in: ids } }, include: cardInclude });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    return r ? [toCard(r, now, promotedIds)] : [];
  });
}

async function resolveCategoryIds(slug: string | undefined): Promise<string[] | null> {
  if (!slug) return null;
  const cat = await db.category.findFirst({ where: { slug, active: true }, select: { id: true, children: { where: { active: true }, select: { id: true } } } });
  if (!cat) return [];
  return [cat.id, ...cat.children.map((c) => c.id)];
}

export type DiscoveryResult = { items: ListingCard[]; total: number; page: number; pageCount: number };

/**
 * Filtered + sorted + paginated discovery, with Postgres FTS (unaccent + simple) and
 * trigram fallback for partial words. All values are bound parameters.
 */
export async function discoverListings(f: DiscoveryFiltersValue, now = new Date()): Promise<DiscoveryResult> {
  const categoryIds = await resolveCategoryIds(f.category);
  if (categoryIds && categoryIds.length === 0) return { items: [], total: 0, page: 1, pageCount: 0 };

  const conds: Prisma.Sql[] = [
    Prisma.sql`l."status" = 'ACTIVE'`,
    Prisma.sql`l."expiresAt" > ${now}`,
    Prisma.sql`u."bannedAt" IS NULL AND u."deletedAt" IS NULL`,
  ];
  if (categoryIds) conds.push(Prisma.sql`l."categoryId" IN (${Prisma.join(categoryIds)})`);
  if (f.city) conds.push(Prisma.sql`c."slug" = ${f.city}`);
  if (f.condition) conds.push(Prisma.sql`l."condition" = ${f.condition}::"ListingCondition"`);
  // Price filters are in major units of EUR for now (single-currency launch).
  if (f.min !== undefined) conds.push(Prisma.sql`l."priceMinor" >= ${f.min * 100}`);
  if (f.max !== undefined) conds.push(Prisma.sql`l."priceMinor" <= ${f.max * 100}`);

  const q = f.q?.trim();
  let rank = Prisma.sql`0`;
  if (q) {
    conds.push(
      Prisma.sql`(l."searchVector" @@ websearch_to_tsquery('simple', immutable_unaccent(${q})) OR immutable_unaccent(l."title") ILIKE '%' || immutable_unaccent(${escapeLike(q)}) || '%' OR word_similarity(immutable_unaccent(${q}), immutable_unaccent(l."title")) > 0.6)`,
    );
    rank = Prisma.sql`ts_rank(l."searchVector", websearch_to_tsquery('simple', immutable_unaccent(${q}))) + word_similarity(immutable_unaccent(${q}), immutable_unaccent(l."title"))`;
  }
  const where = Prisma.join(conds, " AND ");
  const order = {
    ending: Prisma.sql`l."expiresAt" ASC, l."id" ASC`,
    newest: Prisma.sql`l."publishedAt" DESC, l."id" DESC`,
    price_asc: Prisma.sql`l."priceMinor" ASC, l."id" ASC`,
    price_desc: Prisma.sql`l."priceMinor" DESC, l."id" DESC`,
  }[f.sort];
  const orderBy = q && f.sort === "ending" ? Prisma.sql`rank DESC, ${order}` : order;

  const offset = (f.page - 1) * PAGE_SIZE;
  const [rows, countRows] = await Promise.all([
    db.$queryRaw<Array<{ id: string }>>`
      SELECT l."id", ${rank} AS rank
      FROM "Listing" l JOIN "City" c ON c."id" = l."cityId" JOIN "user" u ON u."id" = l."sellerId"
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    db.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*)::bigint AS n
      FROM "Listing" l JOIN "City" c ON c."id" = l."cityId" JOIN "user" u ON u."id" = l."sellerId"
      WHERE ${where}`,
  ]);
  const total = Number(countRows[0]?.n ?? 0);
  const promoted = await activePromotedIds(rows.map((r) => r.id), now);
  return { items: await cardsByIds(rows.map((r) => r.id), now, promoted), total, page: f.page, pageCount: Math.ceil(total / PAGE_SIZE) };
}

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => "\\" + c);
}

async function activePromotedIds(ids: string[], now: Date): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const rows = await db.promotion.findMany({
    where: { listingId: { in: ids }, status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now } },
    select: { listingId: true },
  });
  return new Set(rows.map((r) => r.listingId));
}

export async function recentListings(limit = 8, now = new Date()): Promise<ListingCard[]> {
  const rows = await db.listing.findMany({ where: activeWhere(now), include: cardInclude, orderBy: [{ publishedAt: "desc" }, { id: "desc" }], take: limit });
  const promoted = await activePromotedIds(rows.map((r) => r.id), now);
  return rows.map((r) => toCard(r, now, promoted));
}

export async function endingSoonListings(limit = 8, now = new Date(), excludeId?: string): Promise<ListingCard[]> {
  const rows = await db.listing.findMany({
    where: { ...activeWhere(now), ...(excludeId ? { id: { not: excludeId } } : {}) },
    include: cardInclude,
    orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
    take: limit,
  });
  const promoted = await activePromotedIds(rows.map((r) => r.id), now);
  return rows.map((r) => toCard(r, now, promoted));
}

/**
 * Paid placements: only listings with a verified/granted ACTIVE promotion.
 * Ordered by deadline, capped, and always labelled in the UI.
 */
export async function promotedListings(placement: "FEATURED" | "HOMEPAGE_SPOTLIGHT" | "CATEGORY_SPOTLIGHT", opts: { limit?: number; categoryIds?: string[] } = {}, now = new Date()): Promise<ListingCard[]> {
  const rows = await db.listing.findMany({
    where: {
      ...activeWhere(now),
      ...(opts.categoryIds ? { categoryId: { in: opts.categoryIds } } : {}),
      promotions: { some: { placement, status: "ACTIVE", startsAt: { lte: now }, endsAt: { gt: now } } },
    },
    include: cardInclude,
    orderBy: [{ expiresAt: "asc" }],
    take: opts.limit ?? 4,
  });
  return rows.map((r) => toCard(r, now, new Set(rows.map((x) => x.id))));
}

export async function relatedListings(listing: { id: string; categoryId: string }, limit = 4, now = new Date()): Promise<ListingCard[]> {
  const same = await db.listing.findMany({
    where: { ...activeWhere(now), categoryId: listing.categoryId, id: { not: listing.id } },
    include: cardInclude,
    orderBy: { expiresAt: "asc" },
    take: limit,
  });
  if (same.length >= limit) return same.map((r) => toCard(r, now));
  const more = await endingSoonListings(limit - same.length, now, listing.id);
  const seen = new Set(same.map((s) => s.id));
  return [...same.map((r) => toCard(r, now)), ...more.filter((m) => !seen.has(m.id))];
}

/** Hero clock: the active listing that ends first. */
export async function firstToEnd(now = new Date()): Promise<ListingCard | null> {
  const [first] = await endingSoonListings(1, now);
  return first ?? null;
}

export async function activeCountsByCategory(now = new Date()): Promise<Map<string, number>> {
  const rows = await db.$queryRaw<Array<{ categoryId: string; n: bigint }>>`
    SELECT COALESCE(cat."parentId", cat."id") AS "categoryId", count(*)::bigint AS n
    FROM "Listing" l JOIN "Category" cat ON cat."id" = l."categoryId" JOIN "user" u ON u."id" = l."sellerId"
    WHERE l."status" = 'ACTIVE' AND l."expiresAt" > ${now} AND u."bannedAt" IS NULL AND u."deletedAt" IS NULL
    GROUP BY 1`;
  return new Map(rows.map((r) => [r.categoryId, Number(r.n)]));
}

export const detailInclude = {
  city: true,
  category: { include: { parent: true } },
  images: { orderBy: { position: "asc" } },
  seller: { select: { id: true, name: true, image: true, city: true, createdAt: true, verifiedAt: true, contactConsent: true, whatsapp: true, bannedAt: true, deletedAt: true } },
} satisfies Prisma.ListingInclude;

export type ListingDetail = Prisma.ListingGetPayload<{ include: typeof detailInclude }>;

export async function getListingBySlug(slug: string): Promise<ListingDetail | null> {
  return db.listing.findUnique({ where: { slug }, include: detailInclude });
}

export async function getListingForOwner(id: string) {
  return db.listing.findUnique({ where: { id }, include: { ...detailInclude, images: { orderBy: { position: "asc" } } } });
}

export async function isFavorited(userId: string | undefined, listingId: string): Promise<boolean> {
  if (!userId) return false;
  const f = await db.favorite.findUnique({ where: { userId_listingId: { userId, listingId } }, select: { userId: true } });
  return Boolean(f);
}

export async function favoriteIdsFor(userId: string | undefined, listingIds: string[]): Promise<Set<string>> {
  if (!userId || !listingIds.length) return new Set();
  const rows = await db.favorite.findMany({ where: { userId, listingId: { in: listingIds } }, select: { listingId: true } });
  return new Set(rows.map((r) => r.listingId));
}
