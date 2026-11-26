import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/env";

export type Db = PrismaClient;
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { __db?: PrismaClient };

function client(): PrismaClient {
  if (!globalForDb.__db) {
    const adapter = new PrismaPg({ connectionString: env().DATABASE_URL, max: Number(process.env.DATABASE_POOL_MAX ?? 4) });
    globalForDb.__db = new PrismaClient({ adapter });
  }
  return globalForDb.__db;
}

/**
 * Lazily-created shared client (one per process, survives HMR). Lazy so that `next build`
 * can import server modules without runtime configuration (DATABASE_URL etc.).
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c) as unknown;
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(c) : value;
  },
});
