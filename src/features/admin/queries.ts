import "server-only";
import { db } from "@/server/db";
import { imageUrl } from "@/features/media/service";

function startOfTodayTirane(now = new Date()): Date {
  // Midnight Europe/Tirane expressed in UTC.
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tirane", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const guess = new Date(`${parts}T00:00:00Z`);
  const offsetMin = (new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Tirane" })).getTime() - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime()) / 60000;
  return new Date(guess.getTime() - offsetMin * 60000);
}

export async function adminMetrics(now = new Date()) {
  const today = startOfTodayTirane(now);
  const [users, active, expired, sold, createdToday, pending, openReports, contactClicks, revenue] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.listing.count({ where: { status: "ACTIVE", expiresAt: { gt: now } } }),
    db.listing.count({ where: { OR: [{ status: "EXPIRED" }, { status: "ACTIVE", expiresAt: { lte: now } }] } }),
    db.listing.count({ where: { status: "SOLD" } }),
    db.listing.count({ where: { createdAt: { gte: today } } }),
    db.listing.count({ where: { status: "PENDING_REVIEW" } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.analyticsEvent.count({ where: { type: "CONTACT_CLICK" } }),
    db.payment.groupBy({ by: ["currency"], where: { status: "SUCCEEDED" }, _sum: { amountMinor: true } }),
  ]);
  return {
    users,
    active,
    expired,
    sold,
    createdToday,
    pending,
    openReports,
    contactClicks,
    revenue: revenue.map((r) => ({ currency: r.currency, amountMinor: r._sum.amountMinor ?? 0 })),
  };
}

/** Last 14 days of key events, for a readable activity table. */
export async function dailyActivity(days = 14, now = new Date()) {
  const since = new Date(now.getTime() - days * 86_400_000);
  const rows = await db.$queryRaw<Array<{ day: string; type: string; n: bigint }>>`
    SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Tirane', 'YYYY-MM-DD') AS day, "type"::text AS type, count(*)::bigint AS n
    FROM "AnalyticsEvent" WHERE "createdAt" >= ${since}
    GROUP BY 1, 2 ORDER BY 1 DESC`;
  const byDay = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const d = byDay.get(r.day) ?? {};
    d[r.type] = Number(r.n);
    byDay.set(r.day, d);
  }
  return [...byDay.entries()].map(([day, counts]) => ({ day, counts }));
}

export async function moderationQueue() {
  const rows = await db.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { submittedAt: "asc" },
    take: 50,
    include: {
      images: { orderBy: { position: "asc" } },
      category: { select: { name: true } },
      city: { select: { name: true } },
      seller: { select: { id: true, name: true, email: true, createdAt: true, _count: { select: { listings: true } } } },
    },
  });
  return rows.map((l) => ({ ...l, imageUrls: l.images.map((i) => imageUrl(i.key, 640)) }));
}

export async function openReports() {
  return db.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { listing: { select: { id: true, title: true, slug: true, status: true, sellerId: true } }, reporter: { select: { name: true } } },
  });
}

export async function searchUsers(q: string | undefined, page = 1) {
  const where = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] }
    : {};
  return db.user.findMany({
    where: { ...where, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    skip: (page - 1) * 50,
    select: { id: true, name: true, email: true, role: true, createdAt: true, bannedAt: true, verifiedAt: true, trusted: true, emailVerified: true, _count: { select: { listings: true } } },
  });
}

export async function allCategories() {
  return db.category.findMany({ orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }], include: { _count: { select: { listings: true } } } });
}

export async function promotionAdminData(now = new Date()) {
  const [products, active] = await Promise.all([
    db.promotionProduct.findMany({ orderBy: { priceMinor: "asc" } }),
    db.promotion.findMany({
      where: { status: "ACTIVE", endsAt: { gt: now } },
      orderBy: { endsAt: "asc" },
      include: { listing: { select: { title: true, slug: true } }, product: { select: { name: true } } },
    }),
  ]);
  return { products, active };
}

export async function recentAudit(limit = 100) {
  return db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit, include: { actor: { select: { name: true, email: true } } } });
}

export async function systemHealth() {
  const started = Date.now();
  let dbOk = true;
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  const dbLatencyMs = Date.now() - started;
  const rows = await db.heartbeat.findMany({ orderBy: { name: "asc" } }).catch(() => []);
  const now = Date.now();
  // The expiry job runs every minute; more than 5 minutes of silence means the worker is down.
  const heartbeats = rows.map((b) => ({ ...b, stale: b.name === "listings.expire" && now - b.at.getTime() > 5 * 60_000 }));
  return { dbOk, dbLatencyMs, heartbeats };
}
