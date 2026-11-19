import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;
export const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://shitshpejt:shitshpejt@localhost:5432/shitshpejt_e2e";
export const E2E_STORAGE = "./.storage-e2e";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "off", screenshot: "only-on-failure" },
  projects: [
    // Mobile first (iPhone 14/15 viewport), then desktop.
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
  ],
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DB,
      APP_ENV: "test",
      SITE_URL: baseURL,
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-0123",
      LOCAL_STORAGE_DIR: E2E_STORAGE,
      STORAGE_DRIVER: "local",
      EMAIL_PROVIDER: "console",
      MODERATION_MODE: "first_n",
      MODERATION_TRUST_AFTER: "3",
      DISABLE_RATE_LIMIT: "1",
    },
  },
});
