import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/env";

export type Db = PrismaClient;
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { __db?: PrismaClient };

function create(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env().DATABASE_URL, max: 10 });
  return new PrismaClient({ adapter });
}

/** Single shared client (survives HMR in dev). */
export const db: PrismaClient = globalForDb.__db ?? create();
if (process.env.NODE_ENV !== "production") globalForDb.__db = db;
