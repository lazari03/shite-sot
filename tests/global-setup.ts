import { execSync } from "node:child_process";

/** Apply migrations + reference seed to the dedicated test database once per run. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://shitshpejt:shitshpejt@localhost:5432/shitshpejt_test";
  const env = { ...process.env, DATABASE_URL: url, APP_ENV: "test" };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx --conditions=react-server prisma/seed.ts", { env, stdio: "pipe" });
}
