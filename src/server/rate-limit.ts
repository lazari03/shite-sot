import "server-only";
import { db } from "./db";
import { AppError } from "./errors";

export const LIMITS = {
  "listing:create": { points: 10, windowSec: 3600 },
  "listing:submit": { points: 20, windowSec: 86_400 },
  "listing:update": { points: 60, windowSec: 3600 },
  upload: { points: 80, windowSec: 3600 },
  contact: { points: 30, windowSec: 3600 },
  report: { points: 10, windowSec: 3600 },
  favorite: { points: 120, windowSec: 3600 },
  search: { points: 120, windowSec: 60 },
  "account:update": { points: 30, windowSec: 3600 },
} as const;
export type LimitName = keyof typeof LIMITS;

/**
 * Fixed-window counter in Postgres (single atomic upsert). Good enough for one web node
 * and keeps us Redis-free. Throws RATE_LIMITED when exceeded.
 */
export async function rateLimit(name: LimitName, subject: string): Promise<void> {
  if (process.env.DISABLE_RATE_LIMIT === "1") return;
  const { points, windowSec } = LIMITS[name];
  const key = `${name}:${subject}`;
  const rows = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count")
    VALUES (${key}, now(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec}) THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  if ((rows[0]?.count ?? 0) > points) throw new AppError("RATE_LIMITED", "RATE_LIMITED");
}
