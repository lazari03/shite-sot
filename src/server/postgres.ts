import "server-only";
import { Pool } from "pg";
import { env } from "@/env";

const runtime = globalThis as typeof globalThis & { catalogPool?: Pool };

export function postgres() {
  runtime.catalogPool ??= new Pool({
    connectionString: env().DATABASE_URL,
    max: 3,
    allowExitOnIdle: true,
  });
  return runtime.catalogPool;
}
