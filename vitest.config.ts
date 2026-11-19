import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

const testDb = process.env.TEST_DATABASE_URL ?? "postgresql://shitshpejt:shitshpejt@localhost:5432/shitshpejt_test";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: { "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts") },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    // Integration tests share one database: run files sequentially.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      APP_ENV: "test",
      DATABASE_URL: testDb,
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-0123",
      BETTER_AUTH_URL: "http://localhost:3000",
      SITE_URL: "http://localhost:3000",
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_DIR: "./.storage-test",
      MODERATION_MODE: "first_n",
      MODERATION_TRUST_AFTER: "2",
      LOG_LEVEL: "error",
    },
  },
});
