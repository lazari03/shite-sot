import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { E2E_DB, E2E_STORAGE } from "../../playwright.config";

export default function setup() {
  const env = { ...process.env, DATABASE_URL: E2E_DB, APP_ENV: "test" };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx --conditions=react-server prisma/seed.ts", { env, stdio: "pipe" });
  rmSync(`${E2E_STORAGE}/outbox.jsonl`, { force: true });
  // Hermetic runs: wipe marketplace data (reference data stays).
  execSync(
    `psql "${E2E_DB}" -c 'TRUNCATE "AnalyticsEvent","AuditLog","Promotion","Payment","Report","Favorite","PriceHistory","ListingImage","Listing","session","account","verification","RateLimit","Heartbeat","user" CASCADE'`,
    { stdio: "pipe" },
  );
}
