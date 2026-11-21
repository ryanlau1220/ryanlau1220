import { defineConfig, devices } from "@playwright/test";

// The built Worker runs on local (Miniflare) D1 and R2. globalSetup applies migrations and
// seeds the one entry into that same local state before the server starts, so a fresh CI
// checkout has data to render. The server points at .wrangler/state via --persist-to.
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command:
      "pnpm exec wrangler dev --config dist/server/wrangler.json --persist-to .wrangler/state --local --ip 127.0.0.1 --port 3101 --inspector-port 9232 --log-level warn",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
