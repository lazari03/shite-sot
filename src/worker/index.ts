/**
 * Background worker (pg-boss, Postgres-backed — no Redis).
 * Run: node --conditions=react-server dist/worker.js  (see package.json / Dockerfile)
 */
import "dotenv/config";
import { PgBoss } from "pg-boss";
import type { Prisma } from "@/generated/prisma/client";
import { env } from "@/env";
import { db } from "@/server/db";
import { log } from "@/server/logger";
import { moderateNextListing } from "@/features/listings/ai-moderation";
import { expireDueListings } from "@/features/listings/service";
import { endExpiredPromotions } from "@/features/promotions/service";
import { cleanupOrphanImages } from "@/features/media/service";

const JOBS = {
  "listings.ai-moderation": { cron: "* * * * *", run: async () => ({ approved: await moderateNextListing() }) },
  "listings.expire": { cron: "* * * * *", run: async () => ({ expired: await expireDueListings() }) },
  "promotions.expire": { cron: "*/5 * * * *", run: async () => ({ ended: await endExpiredPromotions() }) },
  "images.cleanup": { cron: "17 * * * *", run: async () => ({ deleted: await cleanupOrphanImages(24) }) },
  "ratelimit.cleanup": {
    cron: "41 3 * * *",
    run: async () => ({ deleted: (await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 2 * 86_400_000) } } })).count }),
  },
} as const;

async function heartbeat(name: string, detail: Prisma.InputJsonObject) {
  await db.heartbeat.upsert({ where: { name }, create: { name, at: new Date(), detail }, update: { at: new Date(), detail } });
}

async function main() {
  const boss = new PgBoss({ connectionString: env().DATABASE_URL, schema: "pgboss" });
  boss.on("error", (err) => log.error("pg-boss error", { err }));
  await boss.start();

  for (const [name, job] of Object.entries(JOBS)) {
    await boss.createQueue(name);
    await boss.schedule(name, job.cron, {}, { tz: "Europe/Tirane" });
    await boss.work(name, async () => {
      const started = Date.now();
      const result = await job.run();
      await heartbeat(name, { ...result, ms: Date.now() - started });
      if (Object.values(result).some((v) => typeof v === "number" && v > 0)) log.info(`job ${name}`, result);
    });
  }
  // Reconcile immediately on boot so a restart never leaves stale ACTIVE rows around.
  await expireDueListings();
  await heartbeat("worker.boot", { pid: process.pid });
  log.info("worker started", { jobs: Object.keys(JOBS) });

  const shutdown = async (sig: string) => {
    log.info("worker stopping", { sig });
    await boss.stop({ graceful: true, timeout: 20_000 }).catch(() => undefined);
    await db.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  log.error("worker crashed", { err });
  process.exit(1);
});
